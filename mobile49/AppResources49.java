package com.marketmarney.mobile;

import android.content.Context;
import android.content.res.AssetManager;
import android.net.Uri;
import android.util.Log;
import android.webkit.ServiceWorkerClient;
import android.webkit.ServiceWorkerController;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import org.json.JSONObject;

/** One immutable resolver for WebView and service-worker requests. No private API caching. */
final class AppResources49 {
    private static volatile AppResources49 shared;
    private final AssetManager assets;
    private final boolean debug;
    private final Map<String,String> files;
    private AppResources49(Context context) {
        assets=context.getApplicationContext().getAssets();
        debug=(context.getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE)!=0;
        Map<String,String> accepted=new HashMap<>();
        try(InputStream in=assets.open("resources49-map.json");ByteArrayOutputStream out=new ByteArrayOutputStream()) {
            byte[] b=new byte[8192];int n;
            while((n=in.read(b))!=-1){out.write(b,0,n);if(out.size()>100000)throw new IllegalStateException("Map too large");}
            JSONObject map=new JSONObject(out.toString("UTF-8"));Iterator<String> keys=map.keys();
            while(keys.hasNext()) {
                String key=keys.next(),file=map.getString(key);
                boolean route=key.equals("/__android43/news")||key.equals("/grup-trader.html")||key.equals("/profil.html")||key.startsWith("/__android48/group/")||key.startsWith("/__android49/profile/");
                boolean source=file.equals("news43.html")||file.startsWith("group48/")||file.startsWith("profile49/");
                if(route&&source&&!key.contains("..")&&!file.contains("..")&&!file.contains("\\")&&!key.contains("%")) accepted.put(key,file);
            }
        } catch(Exception e) { accepted.clear();Log.e("MM49_ASSET","Local asset map unavailable"); }
        files=Collections.unmodifiableMap(accepted);
    }
    static synchronized AppResources49 install(Context context) {
        if(shared==null)shared=new AppResources49(context);
        final AppResources49 resolver=shared;
        // minSdk 24: service-worker loads do not go through WebViewClient.
        ServiceWorkerController.getInstance().setServiceWorkerClient(new ServiceWorkerClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebResourceRequest request) {
                return resolver.respond(request,"worker");
            }
        });
        return resolver;
    }
    WebResourceResponse respond(WebResourceRequest request,String channel) {
        if(request==null||!"GET".equals(request.getMethod()))return null;
        Uri u=request.getUrl();
        if(u==null||!"https".equalsIgnoreCase(u.getScheme())||!"marketmarney.com".equalsIgnoreCase(u.getHost())||(u.getPort()!=-1&&u.getPort()!=443)||u.getUserInfo()!=null)return null;
        String path=u.getEncodedPath(),file=files.get(path);
        if(file==null)return null;
        try {
            String mime=file.endsWith(".css")?"text/css":file.endsWith(".js")?"text/javascript":"text/html";
            Map<String,String> h=new HashMap<>();h.put("Cache-Control","no-store");h.put("X-Content-Type-Options","nosniff");h.put("X-Marney-Asset","49");
            if(file.endsWith(".html"))h.put("Content-Security-Policy","default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; connect-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self' https://fonts.gstatic.com; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'self'");
            if(debug)Log.i("MM49_ASSET",channel+" "+path);
            return new WebResourceResponse(mime,"UTF-8",200,"OK",h,assets.open(file));
        } catch(Exception e) {
            Log.e("MM49_ASSET","Bundled asset missing: "+path);
            Map<String,String> h=new HashMap<>();h.put("Cache-Control","no-store");
            return new WebResourceResponse("text/plain","UTF-8",503,"Local asset unavailable",h,new ByteArrayInputStream("Komponen aplikasi tidak lengkap. Pasang APK perbaikan.".getBytes(StandardCharsets.UTF_8)));
        }
    }
}
