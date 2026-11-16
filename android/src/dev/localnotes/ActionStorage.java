package dev.localnotes;

import android.database.Cursor;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.util.AtomicFile;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

// Synchronized JSON and immutable revisions are the authoritative action storage.
final class ActionStorage {
    private final MainActivity activity;
    private JSONArray readWarnings = new JSONArray();
    private final Uri tree;
    private final File root;
    ActionStorage(MainActivity activity) {
        this.activity = activity;
        this.tree = activity.tree;
        this.root = new File(activity.getFilesDir(), "Sample/LocalNotesData");
    }
    private Uri resolve(String path, boolean create) throws Exception {
        Uri cursor = DocumentsContract.buildDocumentUriUsingTree(tree, DocumentsContract.getTreeDocumentId(tree));
        String[] parts = ("LocalNotesData/" + path).split("/");
        for (int i = 0; i < parts.length; i++) {
            Uri next = activity.child(cursor, parts[i]);
            if (next == null && create) next = DocumentsContract.createDocument(activity.getContentResolver(), cursor,
                i == parts.length - 1 && parts[i].endsWith(".json") ? "application/json" : DocumentsContract.Document.MIME_TYPE_DIR, parts[i]);
            if (next == null) throw new FileNotFoundException(path);
            cursor = next;
        }
        return cursor;
    }
    private String read(String path) throws Exception {
        try (InputStream in = tree == null ? new FileInputStream(new File(root, path)) : activity.getContentResolver().openInputStream(resolve(path, false))) {
            if (in == null) throw new IOException("Action record unavailable");
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buffer = new byte[8192]; int size;
            while ((size = in.read(buffer)) != -1) { out.write(buffer, 0, size); if (out.size() > 2000000) throw new IOException("Action record exceeds 2 MB"); }
            return out.toString("UTF-8");
        }
    }
    private void write(String path, String text, boolean immutable) throws Exception {
        if (immutable) {
            try { if (!read(path).equals(text)) throw new IOException("Immutable revision already exists"); return; }
            catch (FileNotFoundException missing) { /* Create the new revision below. */ }
        }
        byte[] bytes = text.getBytes(StandardCharsets.UTF_8);
        if (tree == null) {
            File file = new File(root, path);
            if (!file.getParentFile().isDirectory() && !file.getParentFile().mkdirs()) throw new IOException("Cannot create action directory");
            if (immutable) {
                if (!file.createNewFile()) throw new IOException("Revision already exists");
                try (FileOutputStream out = new FileOutputStream(file)) { out.write(bytes); out.getFD().sync(); }
            } else {
                AtomicFile atomic = new AtomicFile(file); FileOutputStream out = atomic.startWrite();
                try { out.write(bytes); atomic.finishWrite(out); } catch (Exception e) { atomic.failWrite(out); throw e; }
            }
        } else {
            Uri uri = resolve(path, true);
            try (OutputStream out = activity.getContentResolver().openOutputStream(uri, "wt")) {
                if (out == null) throw new IOException("Cannot write action record"); out.write(bytes);
            }
        }
        if (!read(path).equals(text)) throw new IOException("Action write verification failed; retain the edit and retry");
    }
    String workspace() throws Exception {
        String text;
        try { text = read("workspace.json"); }
        catch (FileNotFoundException missing) {
            text = new JSONObject().put("formatVersion", 1).put("workspaceId", UUID.randomUUID().toString()).toString();
            write("workspace.json", text, true);
        }
        JSONObject record = new JSONObject(text);
        if (record.getInt("formatVersion") != 1) throw new IOException("Unsupported workspace format");
        String id = record.getString("workspaceId"); UUID.fromString(id); return id;
    }
    private void readRecord(String path, JSONObject files) {
        try { files.put(path, read(path)); }
        catch (Exception error) { readWarnings.put(path + ": " + error.getMessage()); }
    }
    private void listLocal(File directory, String prefix, JSONObject files) throws Exception {
        if (!directory.exists()) return;
        File[] children = directory.listFiles(); if (children == null) throw new IOException("Action directory unavailable");
        for (File file : children) {
            if (!file.getCanonicalPath().startsWith(root.getCanonicalPath() + "/")) throw new IOException("Action path escapes workspace");
            String path = prefix + file.getName();
            if (file.isDirectory()) listLocal(file, path + "/", files);
            else if (path.endsWith(".json")) readRecord(path, files);
        }
    }
    private void listTree(Uri directory, String prefix, JSONObject files, int depth) throws Exception {
        if (depth > 3) throw new IOException("Invalid action directory depth");
        Uri children = DocumentsContract.buildChildDocumentsUriUsingTree(tree, DocumentsContract.getDocumentId(directory));
        try (Cursor cursor = activity.getContentResolver().query(children, new String[]{DocumentsContract.Document.COLUMN_DOCUMENT_ID, DocumentsContract.Document.COLUMN_DISPLAY_NAME, DocumentsContract.Document.COLUMN_MIME_TYPE}, null, null, null)) {
            if (cursor == null) throw new IOException("Action directory unavailable");
            while (cursor.moveToNext()) {
                String path = prefix + cursor.getString(1);
                Uri uri = DocumentsContract.buildDocumentUriUsingTree(tree, cursor.getString(0));
                if (DocumentsContract.Document.MIME_TYPE_DIR.equals(cursor.getString(2))) listTree(uri, path + "/", files, depth + 1);
                else if (path.endsWith(".json")) readRecord(path, files);
            }
        }
    }
    JSONObject run(JSONObject request) throws Exception {
        String workspaceId = workspace(), cmd = request.getString("cmd");
        if (cmd.equals("workspace")) return new JSONObject().put("workspaceId", workspaceId).put("root", tree == null ? "Sample" : DocumentsContract.getTreeDocumentId(tree));
        if (!workspaceId.equals(request.optString("workspaceId"))) throw new IOException("Workspace changed; reopen the action");
        switch (cmd) {
            case "actionFiles":
                JSONObject files = new JSONObject(); readWarnings = new JSONArray();
                for (String name : new String[]{"actions", "initiatives", "topics", "revisions"}) {
                    if (tree == null) listLocal(new File(root, name), name + "/", files);
                    else { try { listTree(resolve(name, false), name + "/", files, 0); } catch (FileNotFoundException missing) { /* An empty collection is valid. */ } }
                }
                return new JSONObject().put("files", files).put("warnings", readWarnings);
            case "actionWrite":
                String path = request.getString("path");
                if (!path.matches("((?:actions|initiatives|topics)/[a-fA-F0-9-]{36}|revisions/[a-fA-F0-9-]{36}/[a-fA-F0-9-]{36})\\.json")) throw new IOException("Invalid action record path");
                write(path, request.getString("text"), path.startsWith("revisions/")); return new JSONObject();
            case "actionIndex": case "actionQuery":
                return new ActionIndex(activity.getFilesDir(), workspaceId, request.optString("entityType", "action")).run(request);
            default: throw new IOException("Unknown action storage command");
        }
    }
}
