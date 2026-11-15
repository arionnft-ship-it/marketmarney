package com.marketmarney.mobile;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;
import android.text.Html;
import android.util.Log;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Public editorial content only. Requests never send account cookies. */
final class HomeNews {
    static final String FEED_URL = "https://marketmarney.com/api/content";
    private static final int MAX_BYTES = 4 * 1024 * 1024;
    static final class Story {
        final String id, title, summary, body, source, date;
        Story(JSONObject value) {
            id = value.optString("id").trim();
            title = plain(value.optString("title"));
            summary = plain(value.optString("desc", value.optString("summary")));
            body = plain(value.optString("body", value.optString("content", value.optString("bodyHtml"))));
            source = plain(value.optString("sourceName", value.optString("source")));
            date = value.optString("date", value.optString("publishedAt", value.optString("createdAt")));
        }
        JSONObject json() throws Exception {
            return new JSONObject().put("id", id).put("title", title).put("desc", summary)
                .put("body", body).put("sourceName", source).put("date", date);
        }
    }
    interface Listener {
        void render(List<Story> stories, boolean offline, long fetchedAt);
    }
    final Context context;
    private final Handler main = new Handler(Looper.getMainLooper());
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final Listener listener;
    private volatile boolean closed;
    private boolean busy;
    private List<Story> stories = Collections.emptyList();
    private long fetchedAt;
    private boolean offline;
    HomeNews(Context context, Listener listener) { this.context=context.getApplicationContext(); this.listener=listener; }

    private static String plain(String raw) {
        if (!raw.contains("<") && !raw.contains("&")) return raw.trim();
        return Html.fromHtml(raw, Html.FROM_HTML_MODE_COMPACT).toString().trim();
    }
    static List<Story> parse(String json) throws Exception {
        JSONArray rows = new JSONObject(json).getJSONArray("articles");
        List<Story> result = new ArrayList<>();
        for (int i=0; i<rows.length(); i++) {
            JSONObject a = rows.optJSONObject(i);
            if (a==null || !"published".equalsIgnoreCase(a.optString("status","published"))) continue;
            Story s = new Story(a);
            if (!s.id.isEmpty() && !s.title.isEmpty() && !s.body.isEmpty()) result.add(s);
        }
        Collections.sort(result,(a,b)->b.date.compareTo(a.date)); // Publisher uses UTC ISO-8601.
        return new ArrayList<>(result.subList(0, Math.min(8, result.size())));
    }
    static String read(InputStream in) throws Exception {
        try (InputStream stream=in; ByteArrayOutputStream out=new ByteArrayOutputStream()) {
            byte[] buf=new byte[8192]; int n;
            while ((n=stream.read(buf))!=-1) {
                if (out.size()+n>MAX_BYTES) throw new java.io.IOException("Feed exceeds limit");
                out.write(buf,0,n);
            }
            return out.toString(StandardCharsets.UTF_8.name());
        }
    }
    static String download() throws Exception {
        HttpURLConnection c=(HttpURLConnection)new URL(FEED_URL).openConnection();
        c.setInstanceFollowRedirects(false); c.setConnectTimeout(7500); c.setReadTimeout(9000);
        c.setUseCaches(false); c.setRequestProperty("Accept","application/json");
        try {
            if(c.getResponseCode()!=200)throw new java.io.IOException("Feed unavailable");
            return read(c.getInputStream());
        }finally{c.disconnect();}
    }
    private void publish(List<Story> rows,boolean local,long stamp,boolean finished){
        main.post(()->{
            if(closed)return;
            stories=rows;offline=local;fetchedAt=stamp;if(finished)busy=false;
            listener.render(stories,offline,fetchedAt);
        });
    }
    void open(boolean force) {
        if(closed)return;
        listener.render(stories,offline,fetchedAt);
        if(busy || (!force && !offline && System.currentTimeMillis()-fetchedAt<300000))return;
        busy=true;
        worker.execute(()->{
            SharedPreferences cache=context.getSharedPreferences("public-home-news",Context.MODE_PRIVATE);
            List<Story> previous=Collections.emptyList(); long stamp=cache.getLong("fetched",0);
            try {
                String saved=cache.getString("feed",null);
                if(saved!=null)previous=parse(saved);
                // A successful empty feed is authoritative, including when reopened offline.
                else previous=parse(read(context.getAssets().open("home-edition.json")));
            }catch(Exception ignored){}
            publish(previous,true,stamp,false);
            try {
                List<Story> fresh=parse(download());
                JSONArray rows=new JSONArray();for(Story s:fresh)rows.put(s.json());
                long now=System.currentTimeMillis();
                cache.edit().putLong("fetched",now).putString("feed",new JSONObject().put("articles",rows).toString()).apply();
                publish(fresh,false,now,true);
                Log.i("MMAPP_HOME","publisher response articles="+fresh.size());
            }catch(Exception failed){
                publish(previous,true,stamp,true);
            }
        });
    }
    void close(){closed=true;worker.shutdownNow();}
}
