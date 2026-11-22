#!/usr/bin/env python3
"""Optional private Unix-socket E5 search service for Local Notes."""
import argparse
from contextlib import closing
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import sqlite3
import stat
import tempfile
from socketserver import StreamRequestHandler, ThreadingUnixStreamServer

import numpy as np
import onnxruntime
from tokenizers import Tokenizer

PROTOCOL = "local-notes-meaning-v1"
MODEL_VERSION = "e5-small-761b726-q8-index3"
ASSET_DIGESTS = {
    "tokenizer.json": "0b44a9d7b51c3c62626640cda0e2c2f70fdacdc25bbbd68038369d14ebdf4c39",
    "model_quantized.onnx": "f80102d3f2a1229f387d3c81909990d8945513e347b0eab049f7de3c6f98c193",
}
SCOPES = ("note", "initiative", "action")
MAX_REQUEST_BYTES = 24 * 1024 * 1024
MIN_RELEVANCE = 0.82


class Embedder:
    def __init__(self, directory):
        for name, expected in ASSET_DIGESTS.items():
            with (directory / name).open("rb") as file:
                if hashlib.file_digest(file, "sha256").hexdigest() != expected:
                    raise ValueError(f"Unexpected model asset: {name}")
        self.tokenizer = Tokenizer.from_file(str(directory / "tokenizer.json"))
        self.tokenizer.enable_truncation(max_length=512)
        self.tokenizer.enable_padding(pad_id=1, pad_token="<pad>")
        options = onnxruntime.SessionOptions()
        options.intra_op_num_threads = 4
        options.inter_op_num_threads = 1
        self.session = onnxruntime.InferenceSession(
            str(directory / "model_quantized.onnx"),
            sess_options=options,
            providers=["CPUExecutionProvider"],
        )
        self.input_names = {item.name for item in self.session.get_inputs()}

    def encode(self, role, texts):
        for offset in range(0, len(texts), 16):
            batch = self.tokenizer.encode_batch([f"{role}: {text}" for text in texts[offset:offset + 16]])
            mask = np.asarray([item.attention_mask for item in batch], dtype=np.int64)
            inputs = {
                "input_ids": np.asarray([item.ids for item in batch], dtype=np.int64),
                "attention_mask": mask,
                "token_type_ids": np.asarray([item.type_ids for item in batch], dtype=np.int64),
            }
            tokens, = self.session.run(None, {name: inputs[name] for name in self.input_names})
            pooled = (tokens * mask[..., None]).sum(axis=1) / mask.sum(axis=1, keepdims=True)
            yield from (pooled / np.linalg.norm(pooled, axis=1, keepdims=True)).astype("<f4")


class MeaningIndex:
    def __init__(self, cache, embedder):
        self.cache = cache
        self.embedder = embedder
        cache.mkdir(parents=True, exist_ok=True, mode=0o700)

    def run(self, request):
        operation = request["operation"]
        workspace = request["workspaceId"]
        if not isinstance(workspace, str) or not re.fullmatch(r"[a-fA-F0-9]{8}(?:-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}", workspace):
            raise ValueError("Invalid workspace")
        if operation == "status":
            return {"protocol": PROTOCOL, "model": MODEL_VERSION}

        with closing(sqlite3.connect(self.cache / f"{workspace}-{MODEL_VERSION}.sqlite")) as db, db:
            db.execute("""CREATE TABLE IF NOT EXISTS sources
                (type TEXT, id TEXT, version TEXT, source TEXT, PRIMARY KEY (type,id))""")
            db.execute("""CREATE TABLE IF NOT EXISTS passages
                (type TEXT, id TEXT, position INTEGER, descriptor TEXT, vector BLOB,
                 PRIMARY KEY (type,id,position))""")

            if operation == "inventory":
                return {"sources": [dict(zip(("type", "id", "version"), row)) for row in
                                    db.execute("SELECT type,id,version FROM sources")]}
            if operation == "put":
                entity_type, entity_id, version = self.source(request)
                chunks = request["chunks"]
                descriptor = request["source"]
                if not isinstance(descriptor, dict) or len(chunks) > 11000 or any(not isinstance(chunk["passage"], str) or
                                             not 0 < len(chunk["passage"]) <= 560 for chunk in chunks):
                    raise ValueError("Invalid passages")
                texts = [self.embedding_text(entity_type, chunk["passage"]) for chunk in chunks]
                vectors = list(self.embedder.encode("passage", texts))
                db.execute("DELETE FROM passages WHERE type=? AND id=?", (entity_type, entity_id))
                db.executemany("INSERT INTO passages VALUES(?,?,?,?,?)", (
                    (entity_type, entity_id, index, json.dumps(chunk, ensure_ascii=False), vector.tobytes())
                    for index, (chunk, vector) in enumerate(zip(chunks, vectors))
                ))
                db.execute("INSERT OR REPLACE INTO sources VALUES(?,?,?,?)",
                           (entity_type, entity_id, version, json.dumps(descriptor, ensure_ascii=False)))
                return {"indexed": len(chunks)}
            if operation == "remove":
                entity_type, entity_id, _ = self.source(request)
                db.execute("DELETE FROM passages WHERE type=? AND id=?", (entity_type, entity_id))
                db.execute("DELETE FROM sources WHERE type=? AND id=?", (entity_type, entity_id))
                return {}
            if operation == "query":
                return {"matches": self.query(db, request)}
        raise ValueError("Unsupported operation")

    @staticmethod
    def embedding_text(entity_type, passage):
        if entity_type != "note":
            return passage
        # Rank on the passage body while keeping its original Markdown for display and copying.
        without_headings = re.sub(r"(?m)^#{1,6}[ \t]+[^\n]*(?:\n|$)", "", passage).strip()
        return without_headings or passage

    @staticmethod
    def source(request):
        entity_type, entity_id = request["type"], request["entityId"]
        version = request.get("version", "")
        if entity_type not in SCOPES or not all(isinstance(value, str) and len(value) <= 4096
                                                for value in (entity_id, version)) or not entity_id:
            raise ValueError("Invalid source")
        return entity_type, entity_id, version

    def query(self, db, request):
        db.execute("BEGIN")
        scope = request["scope"]
        query = request["query"]
        if scope not in (*SCOPES, "all") or not isinstance(query, str) or not 0 < len(query) <= 512:
            raise ValueError("Invalid query")
        vector = next(self.embedder.encode("query", [query]))
        rows = db.execute("SELECT type,id,position,vector FROM passages WHERE (?='all' OR type=?)", (scope, scope))
        candidates = []
        for entity_type, entity_id, position, encoded in rows:
            score = float(np.dot(np.frombuffer(encoded, dtype="<f4"), vector))
            if score >= MIN_RELEVANCE:
                candidates.append((score, entity_type, entity_id, position))
        candidates.sort(key=lambda row: (-row[0], *row[1:]))
        results = []
        for _, entity_type, entity_id, position in candidates[:12]:
            fragment, source = db.execute(
                """SELECT passages.descriptor, sources.source FROM passages
                   JOIN sources USING(type,id) WHERE type=? AND id=? AND position=?""",
                (entity_type, entity_id, position),
            ).fetchone()
            results.append({"source": json.loads(source), "chunk": json.loads(fragment)})
        return results


class Handler(StreamRequestHandler):
    def handle(self):
        try:
            line = self.rfile.readline(MAX_REQUEST_BYTES + 1)
            if not line.endswith(b"\n") or len(line) > MAX_REQUEST_BYTES:
                raise ValueError("Invalid request size")
            payload = self.server.index.run(json.loads(line))
        except (KeyError, TypeError, ValueError, OSError, sqlite3.Error, RuntimeError):
            payload = {"error": "Request failed"}
        self.wfile.write(json.dumps(payload, ensure_ascii=False).encode() + b"\n")


def serve(endpoint, index):
    directory = endpoint.parent
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    details = directory.lstat()
    if not stat.S_ISDIR(details.st_mode) or details.st_uid != os.getuid() or details.st_mode & 0o077:
        raise PermissionError("Meaning search socket requires an owner-only directory")
    with (directory / "service.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        try:
            previous = endpoint.lstat()
        except FileNotFoundError:
            pass
        else:
            if not stat.S_ISSOCK(previous.st_mode) or previous.st_uid != os.getuid():
                raise PermissionError("Refusing to replace an unrelated socket path")
            endpoint.unlink()
        try:
            with ThreadingUnixStreamServer(str(endpoint), Handler) as server:
                endpoint.chmod(0o600)
                server.index = index
                print("Local Notes meaning search is ready on a private socket.", flush=True)
                server.serve_forever()
        finally:
            endpoint.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model-dir", type=Path, required=True)
    parser.add_argument("--cache-dir", type=Path,
                        default=Path.home() / "Library/Application Support/LocalNotes/MeaningSearch")
    parser.add_argument("--socket", type=Path, default=Path(tempfile.gettempdir()) / "ln-meaning/service.sock")
    options = parser.parse_args()
    os.umask(0o077)
    serve(options.socket, MeaningIndex(options.cache_dir, Embedder(options.model_dir)))


if __name__ == "__main__":
    main()
