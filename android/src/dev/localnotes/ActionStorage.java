package dev.localnotes;

import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.content.ContentValues;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.util.AtomicFile;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

// JSON and immutable revisions synchronize; SQLite is an app-private, rebuildable query index.
final class ActionStorage {
    private final MainActivity activity;
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
    private String workspace() throws Exception {
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
    private void listLocal(File directory, String prefix, JSONObject files) throws Exception {
        if (!directory.exists()) return;
        File[] children = directory.listFiles(); if (children == null) throw new IOException("Action directory unavailable");
        for (File file : children) {
            if (!file.getCanonicalPath().startsWith(root.getCanonicalPath() + "/")) throw new IOException("Action path escapes workspace");
            String path = prefix + file.getName();
            if (file.isDirectory()) listLocal(file, path + "/", files);
            else if (path.endsWith(".json")) files.put(path, read(path));
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
                else if (path.endsWith(".json")) files.put(path, read(path));
            }
        }
    }
    private void index(SQLiteDatabase db, JSONObject record) throws Exception {
        ContentValues values = new ContentValues();
        values.put("id", record.getString("entityId")); values.put("status", record.getString("status"));
        values.put("description", record.getString("description")); values.put("record", record.toString());
        if (db.insertWithOnConflict("actions", null, values, SQLiteDatabase.CONFLICT_REPLACE) == -1) throw new IOException("Cannot update action index");
    }
    JSONObject run(JSONObject request) throws Exception {
        String workspaceId = workspace(), cmd = request.getString("cmd");
        if (cmd.equals("workspace")) return new JSONObject().put("workspaceId", workspaceId).put("root", tree == null ? "Sample" : DocumentsContract.getTreeDocumentId(tree));
        if (!workspaceId.equals(request.optString("workspaceId"))) throw new IOException("Workspace changed; reopen the action");
        switch (cmd) {
            case "actionFiles":
                JSONObject files = new JSONObject();
                for (String name : new String[]{"actions", "revisions"}) {
                    if (tree == null) listLocal(new File(root, name), name + "/", files);
                    else { try { listTree(resolve(name, false), name + "/", files, 0); } catch (FileNotFoundException missing) { /* An empty collection is valid. */ } }
                }
                return new JSONObject().put("files", files);
            case "actionWrite":
                String path = request.getString("path");
                if (!path.matches("(actions/[a-fA-F0-9-]{36}|revisions/[a-fA-F0-9-]{36}/[a-fA-F0-9-]{36})\\.json")) throw new IOException("Invalid action record path");
                write(path, request.getString("text"), path.startsWith("revisions/")); return new JSONObject();
            case "actionIndex": case "actionQuery":
                File directory = new File(activity.getFilesDir(), "Workspaces/" + workspaceId);
                if (!directory.isDirectory() && !directory.mkdirs()) throw new IOException("Cannot create local index directory");
                File databaseFile = new File(directory, "actions.sqlite");
                if (cmd.equals("actionIndex") && request.has("records")) { if (databaseFile.exists() && !SQLiteDatabase.deleteDatabase(databaseFile)) throw new IOException("Cannot rebuild local action index"); }
                else if (!databaseFile.exists()) throw new IOException("INDEX_REBUILD_REQUIRED: Local action index is missing");
                try (SQLiteDatabase db = SQLiteDatabase.openOrCreateDatabase(databaseFile, null)) {
                    db.execSQL("CREATE TABLE IF NOT EXISTS actions (id TEXT PRIMARY KEY, status TEXT NOT NULL, description TEXT NOT NULL, record TEXT NOT NULL)");
                    if (cmd.equals("actionIndex")) {
                        if (request.has("records")) {
                            db.beginTransaction();
                            try { db.delete("actions", null, null); JSONArray records = request.getJSONArray("records"); for (int i = 0; i < records.length(); i++) index(db, records.getJSONObject(i)); db.setTransactionSuccessful(); }
                            finally { db.endTransaction(); }
                        } else index(db, request.getJSONObject("record"));
                        return new JSONObject();
                    }
                    int limit = Math.max(1, Math.min(100, request.optInt("limit", 30))), offset = Math.max(0, request.optInt("offset", 0));
                    String status = request.optString("status", ""); JSONArray actions = new JSONArray(); boolean hasMore;
                    try (Cursor cursor = db.rawQuery("SELECT record FROM actions WHERE (?='' OR status=?) AND instr(lower(description),lower(?))>0 ORDER BY id LIMIT ? OFFSET ?",
                        new String[]{status, status, request.optString("search", ""), Integer.toString(limit + 1), Integer.toString(offset)})) {
                        while (cursor.moveToNext() && actions.length() < limit) actions.put(new JSONObject(cursor.getString(0)));
                        hasMore = actions.length() == limit && !cursor.isAfterLast();
                    }
                    return new JSONObject().put("actions", actions).put("hasMore", hasMore);
                }
            default: throw new IOException("Unknown action storage command");
        }
    }
}
