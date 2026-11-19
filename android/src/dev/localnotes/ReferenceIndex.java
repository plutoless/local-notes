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
            String archive = "CASE WHEN instr('/'||lower(directory)||'/', '/archive/')>0 OR instr('/'||lower(directory)||'/', '/archives/')>0 OR instr('/'||lower(directory)||'/', '/archived/')>0 OR instr('/'||directory||'/', '/归档/')>0 THEN 1 ELSE 0 END";
            if (command.equals("referencePut")) {
                JSONObject record = r.getJSONObject("record");
                db.execSQL("INSERT OR REPLACE INTO notes VALUES(?,?,COALESCE((SELECT topics FROM notes WHERE path=?),''),?,?)", new Object[]{record.getString("path"), r.optString("search"), record.getString("path"), record.optString("directory"), record.toString()});
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
                if (global) sql += " AND (instr(record, '\"searchVersion\":1,')>0 OR instr(record, '\"searchVersion\":1}')>0)";
                if (r.has("exactPath")) { sql += command.equals("referenceInventory") ? " WHERE path=?" : " AND path=?"; args.add(r.getString("exactPath")); }
                if (r.has("paths")) { JSONArray paths = r.getJSONArray("paths"); sql += paths.length() == 0 ? " AND 0" : " AND path IN (" + String.join(",", Collections.nCopies(paths.length(), "?")) + ")"; for (int i = 0; i < paths.length(); i++) args.add(paths.getString(i)); }
                Integer total = null;
                if (command.equals("referenceQuery")) {
                    if (r.optString("archives").equals("exclude")) sql += " AND (" + archive + ")=0";
                    if (r.optString("archives").equals("only")) sql += " AND (" + archive + ")=1";
                    try (Cursor count = db.rawQuery(sql.replace("SELECT record FROM", "SELECT count(*) FROM"), args.toArray(new String[0]))) {
                        if (!count.moveToFirst()) throw new IOException("Cannot count references");
                        total = count.getInt(0);
                    }
                }
                if (global) { sql += " ORDER BY CASE WHEN instr(lower(substr(search,1,instr(search,char(10))-1)),lower(?))>0 THEN 0 ELSE 1 END, path LIMIT ? OFFSET ?"; args.add(r.optString("search")); }
                else if (command.equals("referenceQuery")) {
                    String order = r.optString("order", "current");
                    String ordering = order.equals("title") ? "lower(substr(search,1,instr(search,char(10))-1)), path" : order.equals("path") ? "path" : "(" + archive + "), path";
                    sql += " ORDER BY " + ordering + " LIMIT ? OFFSET ?";
                } else sql += " ORDER BY path LIMIT ? OFFSET ?";
                Collections.addAll(args, String.valueOf(limit + 1), String.valueOf(Math.max(0, r.optInt("offset"))));
                if (global) {
                    sql = "WITH RECURSIVE sources AS (SELECT path,record,substr(search,instr(search,char(10))+1) AS body, CASE WHEN instr(lower(substr(search,1,instr(search,char(10))-1)),lower(?))>0 THEN 0 ELSE 1 END AS rank FROM notes WHERE instr(lower(search),lower(?))>0 AND (instr(record, '\"searchVersion\":1,')>0 OR instr(record, '\"searchVersion\":1}')>0)), passages(path,record,body,rank,start) AS (SELECT path,record,body,rank,max(1,instr(lower(body),lower(?))-180) FROM sources UNION ALL SELECT path,record,body,rank,start+899+instr(lower(substr(body,start+900)),lower(?)) FROM passages WHERE instr(lower(substr(body,start+900)),lower(?))>0) SELECT record,substr(body,start,900),start FROM passages ORDER BY rank,path,start LIMIT ? OFFSET ?";
                    args.clear(); for (int i=0;i<5;i++) args.add(r.optString("search"));
                    Collections.addAll(args, String.valueOf(limit+1), String.valueOf(Math.max(0,r.optInt("offset"))));
                }
                JSONArray notes = new JSONArray(); boolean more;
                try (Cursor cursor = db.rawQuery(sql, args.toArray(new String[0]))) {
                    while (cursor.moveToNext() && notes.length() < limit) {
                        JSONObject record = new JSONObject(cursor.getString(0));
                        if (global) record.put("passage", cursor.getString(1)).put("passageStart", cursor.getInt(2));
                        notes.put(record);
                    }
                    more = !cursor.isAfterLast();
                }
                return new JSONObject().put("notes", notes).put("hasMore", more).put("total", total);
            }
            return new JSONObject();
        }
    }
}
