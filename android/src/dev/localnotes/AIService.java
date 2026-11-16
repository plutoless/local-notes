package dev.localnotes;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;

// Native networking only; credentials never leave app-private preferences as bridge results.
final class AIService {
 private final SharedPreferences settings;
 private volatile HttpURLConnection active;
 AIService(Context context) { settings = context.getSharedPreferences("ai-service", Context.MODE_PRIVATE); }
 JSONObject configure(JSONObject request) throws Exception {
  if (request.getString("cmd").equals("aiSettings")) return new JSONObject().put("address", settings.getString("address", "")).put("model", settings.getString("model", "")).put("configured", !settings.getString("token", "").isEmpty());
  String address = request.getString("address"), model = request.getString("model"), token = request.optString("token");
  URI uri = new URI(address);
  if (!uri.getScheme().equals("https") || uri.getHost() == null || uri.getUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null || model.trim().isEmpty()) throw new IOException("Use an HTTPS Chat Completions endpoint and model");
  if (!settings.edit().putString("address", address).putString("model", model).putString("token", token.isEmpty() ? settings.getString("token", "") : token).commit()) throw new IOException("Settings not saved");
  return new JSONObject();
 }
 synchronized void cancel() { if (active != null) { active.disconnect(); active = null; } }
 JSONObject analyze(JSONObject request) throws Exception {
  String token = settings.getString("token", ""), address = settings.getString("address", ""), model = settings.getString("model", "");
  if (token.isEmpty() || address.isEmpty()) throw new IOException("Missing configuration");
  JSONArray messages = request.getJSONArray("messages");
  byte[] body = new JSONObject().put("model", model).put("messages", messages).put("stream", false).toString().getBytes(StandardCharsets.UTF_8);
  if (messages.length() != 2 || body.length > 100000 || messages.toString().contains(token)) throw new IOException("Invalid or credential-containing input");
  HttpURLConnection connection = (HttpURLConnection)new URL(address).openConnection();
  synchronized(this) { if (active != null) throw new IOException("Analysis already running"); active = connection; }
  try {
   connection.setInstanceFollowRedirects(false); connection.setConnectTimeout(15000); connection.setReadTimeout(45000); connection.setRequestMethod("POST"); connection.setDoOutput(true);
   connection.setRequestProperty("Authorization", "Bearer " + token); connection.setRequestProperty("Content-Type", "application/json"); connection.setFixedLengthStreamingMode(body.length);
   try(OutputStream out = connection.getOutputStream()) { out.write(body); }
   int status = connection.getResponseCode();
   if (status != 200) throw new IOException(status == 429 ? "Rate limited; retry explicitly" : "Service failed (HTTP " + status + "); retry explicitly");
   ByteArrayOutputStream bytes = new ByteArrayOutputStream();
   try(InputStream in = connection.getInputStream()) { byte[] buffer = new byte[8192]; int n; while((n = in.read(buffer)) != -1) { bytes.write(buffer,0,n); if(bytes.size() > 2000000) throw new IOException("Invalid response: too large"); } }
   JSONObject message = new JSONObject(bytes.toString("UTF-8")).getJSONArray("choices").getJSONObject(0).getJSONObject("message");
   String text = message.getString("content");
   if(message.has("tool_calls") || text.contains(token)) throw new IOException("Invalid response");
   synchronized(this) { if(active != connection) throw new IOException("Canceled"); }
   return new JSONObject().put("text", text);
  } catch(SocketTimeoutException error) { throw new IOException("Timeout; retry explicitly"); }
    catch(JSONException error) { throw new IOException("Invalid response"); }
    catch(IOException error) { synchronized(this) { if(active != connection) throw new IOException("Canceled"); } String message=error.getMessage(); if(message != null && (message.startsWith("Rate limited") || message.startsWith("Service failed") || message.startsWith("Invalid response") || message.startsWith("Timeout"))) throw error; throw new IOException("Offline or connection failed; retry explicitly"); }
  finally { synchronized(this) { if(active == connection) active = null; } connection.disconnect(); }
 }
}
