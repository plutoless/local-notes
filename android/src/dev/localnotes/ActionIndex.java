package dev.localnotes;

import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.content.ContentValues;
import org.json.*;
import java.io.*;

// This device-local index can be discarded and reconstructed from synchronized revisions.
final class ActionIndex {
    private final File privateRoot;
    private final String workspaceId;
    private final String entityType;
    ActionIndex(File privateRoot, String workspaceId, String entityType) { this.privateRoot = privateRoot; this.workspaceId = workspaceId; this.entityType = (entityType.equals("initiative") || entityType.equals("topic")) ? entityType : "action"; }
    private void index(SQLiteDatabase db, JSONObject record) throws Exception {
        ContentValues values = new ContentValues();
        values.put("id", record.getString("entityId")); values.put("status", record.getString("status"));
        values.put("description", record.getString("description")); values.put("record", record.toString());
        if (db.insertWithOnConflict("actions", null, values, SQLiteDatabase.CONFLICT_REPLACE) == -1) throw new IOException("Cannot update action index");
    }
    JSONObject run(JSONObject request) throws Exception {
        String cmd = request.getString("cmd");
        File directory = new File(privateRoot, "Workspaces/" + workspaceId);
        if (!directory.isDirectory() && !directory.mkdirs()) throw new IOException("Cannot create local index directory");
        File databaseFile = new File(directory, entityType + "s.sqlite");
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
    }
}
