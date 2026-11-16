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
                db.execSQL("INSERT OR REPLACE INTO notes VALUES(?,?,?,?,?)", new Object[]{record.getString("path"), r.optString("search"), "", record.optString("directory"), record.toString()});
            } else if (command.equals("referenceRemove")) db.execSQL("DELETE FROM notes WHERE path=?", new Object[]{r.getString("path")});
            else if (command.equals("referenceTags")) db.execSQL("UPDATE notes SET topics=? WHERE path=?", new Object[]{r.optString("topics"), r.getString("path")});
            else {
                int limit = Math.max(1, Math.min(100, r.optInt("limit", 50)));
                String sql = "SELECT record FROM notes";
                ArrayList<String> args = new ArrayList<>();
                if (!command.equals("referenceInventory")) {
                    sql += " WHERE instr(lower(search),lower(?))>0 AND (?='*' OR directory=?) AND (?='' OR (?='uncategorized' AND topics='') OR instr(topics,?)>0)";
                    String directory = r.optString("directory", "*"), topic = r.optString("topic");
                    Collections.addAll(args, r.optString("search"), directory, directory, topic, topic, topic);
                }
                sql += " ORDER BY path LIMIT ? OFFSET ?";
                Collections.addAll(args, String.valueOf(limit + 1), String.valueOf(Math.max(0, r.optInt("offset"))));
                JSONArray notes = new JSONArray(); boolean more;
                try (Cursor cursor = db.rawQuery(sql, args.toArray(new String[0]))) {
                    while (cursor.moveToNext() && notes.length() < limit) notes.put(new JSONObject(cursor.getString(0)));
                    more = !cursor.isAfterLast();
                }
                return new JSONObject().put("notes", notes).put("hasMore", more);
            }
            return new JSONObject();
        }
    }
}
