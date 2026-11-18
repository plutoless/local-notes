package dev.localnotes;

import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import org.json.*;
import java.io.*;
import java.util.*;

// Private rebuildable search data; body-free records are the only list payload.
final class ReferenceIndex {
    private final File directory;
    ReferenceIndex(File root, String workspace) { directory = new File(root, "Workspaces/" + workspace); }
    JSONObject run(JSONObject r) throws Exception {
        if (!directory.isDirectory() && !directory.mkdirs()) throw new IOException("Cannot create reference index directory");
        try (SQLiteDatabase db = SQLiteDatabase.openOrCreateDatabase(new File(directory, "references.sqlite"), null)) {
            db.execSQL("CREATE TABLE IF NOT EXISTS notes(path TEXT PRIMARY KEY, search TEXT, topics TEXT, directory TEXT, record TEXT)");
            String command = r.getString("cmd");
            if (command.equals("referencePut")) {
                JSONObject record = r.getJSONObject("record");
                db.execSQL("INSERT INTO notes VALUES(?,?,?,?,?) ON CONFLICT(path) DO UPDATE SET search=excluded.search, directory=excluded.directory, record=excluded.record", new Object[]{record.getString("path"), r.optString("search"), "", record.optString("directory"), record.toString()});
            } else if (command.equals("referenceRemove")) db.execSQL("DELETE FROM notes WHERE path=?", new Object[]{r.getString("path")});
            else if (command.equals("referenceTags")) db.execSQL("UPDATE notes SET topics=? WHERE path=?", new Object[]{r.optString("topics"), r.getString("path")});
            else {
                int limit = Math.max(1, Math.min(100, r.optInt("limit", 50)));
                boolean global = command.equals("referenceSearch");
                String sql = global ? "SELECT record, substr(substr(search,instr(search,char(10))+1), max(1,instr(lower(substr(search,instr(search,char(10))+1)),lower(?))-180),900) FROM notes" : "SELECT record FROM notes";
                ArrayList<String> args = new ArrayList<>();
                if (global) args.add(r.optString("search"));
                if (!command.equals("referenceInventory")) {
                    sql += " WHERE instr(lower(search),lower(?))>0 AND (?='*' OR directory=?) AND (?='' OR (?='uncategorized' AND topics='') OR instr(topics,?)>0)";
                    String directory = r.optString("directory", "*"), topic = r.optString("topic");
                    Collections.addAll(args, r.optString("search"), directory, directory, topic, topic, topic);
                }
                if (r.has("exactPath")) { sql += command.equals("referenceInventory") ? " WHERE path=?" : " AND path=?"; args.add(r.getString("exactPath")); }
                if (r.has("paths")) { JSONArray paths = r.getJSONArray("paths"); sql += paths.length() == 0 ? " AND 0" : " AND path IN (" + String.join(",", Collections.nCopies(paths.length(), "?")) + ")"; for (int i = 0; i < paths.length(); i++) args.add(paths.getString(i)); }
                if (global) { sql += " ORDER BY CASE WHEN instr(lower(json_extract(record, '$.title')),lower(?))>0 THEN 0 ELSE 1 END, path LIMIT ? OFFSET ?"; args.add(r.optString("search")); }
                else sql += " ORDER BY path LIMIT ? OFFSET ?";
                Collections.addAll(args, String.valueOf(limit + 1), String.valueOf(Math.max(0, r.optInt("offset"))));
                JSONArray notes = new JSONArray(); boolean more;
                try (Cursor cursor = db.rawQuery(sql, args.toArray(new String[0]))) {
                    while (cursor.moveToNext() && notes.length() < limit) {
                        JSONObject record = new JSONObject(cursor.getString(0));
                        if (global) record.put("passage", cursor.getString(1));
                        notes.put(record);
                    }
                    more = !cursor.isAfterLast();
                }
                return new JSONObject().put("notes", notes).put("hasMore", more);
            }
            return new JSONObject();
        }
    }
}
