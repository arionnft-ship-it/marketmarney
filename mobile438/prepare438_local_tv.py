#!/usr/bin/env python3
"""Replace the heavy public homepage TV route with a lightweight local shell.

The app chrome and all Marney 4.38 assets remain unchanged. The local page is
served under the MarketMarney origin, loads the public /api/content catalogue,
and has a bounded native HTTPS + bundled public snapshot fallback.
"""
from pathlib import Path
import shutil
import sys


def once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one source anchor, found {count}")
    return text.replace(old, new, 1)


def apply(root: Path) -> None:
    java = root / 'app/src/main/java/com/marketmarney/mobile/MainActivity.java'
    src = java.read_text(encoding='utf-8')

    src = once(
        src,
        '"/index.html#mm-app-tv"',
        '"/__android43/marketmarney-tv"',
        'local TV destination',
    )

    news_anchor = '                if(own(u)&&NEWS_PATH.equals(u.getPath())&&"GET".equals(req.getMethod())){'
    tv_intercept = '''                if(own(u)&&"/__android43/marketmarney-tv".equals(u.getPath())&&"GET".equals(req.getMethod())){
                    try{
                        WebResourceResponse r=new WebResourceResponse("text/html","UTF-8",getAssets().open("marketmarney-tv.html"));
                        Map<String,String> h=new HashMap<>();
                        h.put("Cache-Control","no-store");
                        h.put("X-Content-Type-Options","nosniff");
                        h.put("Content-Security-Policy","default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' https: data:; media-src 'self' https: blob:; frame-src https://www.youtube-nocookie.com; base-uri 'none'; object-src 'none'; form-action 'none'");
                        r.setResponseHeaders(h);return r;
                    }catch(Exception e){
                        return new WebResourceResponse("text/plain","UTF-8",new ByteArrayInputStream("MarketMarney TV belum bisa dibuka.".getBytes(StandardCharsets.UTF_8)));
                    }
                }
'''
    src = once(src, news_anchor, tv_intercept + news_anchor, 'TV local page intercept')

    native = r'''    private static boolean allowedTvHost(String host){
        if(host==null)return false;
        host=host.toLowerCase(java.util.Locale.ROOT);
        return host.equals("marketmarney.com")||host.equals("www.marketmarney.com")
            ||host.equals("youtu.be")||host.equals("youtube.com")||host.equals("www.youtube.com")
            ||host.equals("www.youtube-nocookie.com")||host.equals("i.ytimg.com");
    }
    private static String safeTvUrl(String raw){
        if(raw==null||raw.length()==0)return "";
        try{
            Uri uri=Uri.parse(raw.startsWith("/")?BASE+raw:raw);
            return "https".equalsIgnoreCase(uri.getScheme())&&allowedTvHost(uri.getHost())?uri.toString():"";
        }catch(Exception ignored){return "";}
    }
    private static String boundedText(InputStream stream,int limit) throws java.io.IOException{
        ByteArrayOutputStream out=new ByteArrayOutputStream();
        byte[] buffer=new byte[8192];int read;
        while((read=stream.read(buffer))!=-1){
            if(out.size()+read>limit)throw new java.io.IOException("TV catalogue exceeds size cap");
            out.write(buffer,0,read);
        }
        return out.toString(StandardCharsets.UTF_8.name());
    }
    private static String publishedTvPayload(String raw) throws Exception{
        JSONObject decoded=new JSONObject(raw);
        org.json.JSONArray source=decoded.optJSONArray("videos");
        if(source==null)throw new java.io.IOException("Missing public videos array");
        org.json.JSONArray published=new org.json.JSONArray();
        for(int i=0;i<source.length()&&i<200;i++){
            JSONObject item=source.optJSONObject(i);
            if(item==null||!"published".equals(item.optString("status")))continue;
            String title=item.optString("title");
            String type=item.optString("type");
            String url=safeTvUrl(item.optString("url"));
            if(title.length()==0||url.length()==0||!("mp4".equals(type)||"youtube".equals(type)))continue;
            JSONObject clean=new JSONObject();
            clean.put("id",item.optString("id").substring(0,Math.min(item.optString("id").length(),240)));
            clean.put("title",title.substring(0,Math.min(title.length(),240)));
            String category=item.optString("cat");clean.put("cat",category.substring(0,Math.min(category.length(),240)));
            String date=item.optString("date");clean.put("date",date.substring(0,Math.min(date.length(),240)));
            String desc=item.optString("desc");clean.put("desc",desc.substring(0,Math.min(desc.length(),500)));
            clean.put("type",type);clean.put("url",url);
            clean.put("thumb",safeTvUrl(item.optString("thumb")));
            clean.put("status","published");published.put(clean);
        }
        if(published.length()==0)throw new java.io.IOException("No published TV videos");
        JSONObject result=new JSONObject();result.put("videos",published);return result.toString();
    }
    private String liveTvCatalogue() throws Exception{
        java.net.HttpURLConnection connection=null;
        try{
            java.net.URL endpoint=new java.net.URL(BASE+"/api/content");
            connection=(java.net.HttpURLConnection)endpoint.openConnection();
            connection.setRequestMethod("GET");connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(6500);connection.setReadTimeout(8500);connection.setUseCaches(false);
            connection.setRequestProperty("Accept","application/json");
            connection.setRequestProperty("Accept-Encoding","identity");
            connection.setRequestProperty("User-Agent","MarketMarney-Android-TV/1.1");
            if(connection.getResponseCode()!=200)throw new java.io.IOException("TV API status not 200");
            String mime=connection.getContentType();
            if(mime==null||!mime.toLowerCase(java.util.Locale.ROOT).contains("json"))throw new java.io.IOException("TV API is not JSON");
            try(InputStream input=connection.getInputStream()){
                return publishedTvPayload(boundedText(input,2_000_000));
            }
        }finally{if(connection!=null)connection.disconnect();}
    }
    private void requestNativeTvCatalogue(WebView target,String url,int epoch){
        if(destroyed||target!=web||tab!=XAUWAR||epoch!=tvRouteEpoch||!own(url)
            ||!"/__android43/marketmarney-tv".equals(Uri.parse(url).getPath()))return;
        Thread request=new Thread(()->{
            String payload=null,source="native-live";
            try{payload=liveTvCatalogue();}
            catch(Exception liveError){
                source="bundled-snapshot";
                Log.w("MMAPP_TV_NET","Live TV catalogue unavailable; using bundled public snapshot");
                try(InputStream input=getAssets().open("marketmarney-tv-catalogue.json")){
                    payload=publishedTvPayload(boundedText(input,400_000));
                }catch(Exception unavailable){
                    Log.e("MMAPP_TV_NET","No valid public TV snapshot in APK");return;
                }
            }
            final String safePayload=payload,safeSource=source;
            runOnUiThread(()->{
                if(destroyed||target!=web||tab!=XAUWAR||epoch!=tvRouteEpoch||!own(target.getUrl())
                    ||!"/__android43/marketmarney-tv".equals(Uri.parse(target.getUrl()).getPath()))return;
                target.evaluateJavascript("try{if(document.documentElement.dataset.mmTvStatus!=='ready'&&window.MMNativeTvReceive){window.MMNativeTvReceive("
                    +JSONObject.quote(safePayload)+","+JSONObject.quote(safeSource)+")}}catch(e){}",null);
                Log.i("MMAPP_TV_NET","catalogue delivered source="+safeSource);
            });
        },"MarneyTvPublicCatalog");
        request.setDaemon(true);request.start();
    }
'''
    src = once(src, '    private int tvRouteEpoch=0;', native + '    private int tvRouteEpoch=0;', 'native TV fallback')

    method_start = src.index('    private void routeMarketMarneyTv(WebView target,String url,int epoch,int attempt){')
    method_end = src.index('    private void pageReady(WebView target,String url){', method_start)
    local_route = r'''    private void routeMarketMarneyTv(WebView target,String url,int epoch,int attempt){
        if(destroyed||target!=web||tab!=XAUWAR||mainFailed||epoch!=tvRouteEpoch
            ||!Recovery414.sameDocument(url,target.getUrl())){if(epoch==tvRouteEpoch)tvRouteChecking=false;return;}
        if(attempt==1)requestNativeTvCatalogue(target,url,epoch);
        String js="(function(){var root=document.getElementById('mm-tv-root');"
            +"if(!root||root.getBoundingClientRect().height<150)return 'wait';"
            +"var state=document.documentElement.dataset.mmTvStatus;"
            +"var grid=document.getElementById('grid');"
            +"var count=grid?grid.querySelectorAll('.card').length:0;"
            +"return state==='ready'&&count>0?'ready:'+count:state==='error'?'error':'shell';})()";
        target.evaluateJavascript(js,value->{
            if(destroyed||target!=web||tab!=XAUWAR||mainFailed||epoch!=tvRouteEpoch
                ||!Recovery414.sameDocument(url,target.getUrl())){if(epoch==tvRouteEpoch)tvRouteChecking=false;return;}
            if(value!=null&&value.startsWith("\"ready:")){
                tvRouteChecking=false;tvRouteRetry=null;
                Log.i("MMAPP_TV","ready catalogue="+value);
                completePageReady(target,url);endLaunchAnimation(true,"tv-ready");return;
            }
            if(attempt==24||attempt==60)requestNativeTvCatalogue(target,url,epoch);
            if(attempt>=110){
                tvRouteChecking=false;tvRouteRetry=null;
                Log.e("MMAPP_TV","local catalogue timeout state="+value);
                showFailure("TV","Daftar video MarketMarney TV belum dapat ditampilkan. Periksa koneksi lalu coba lagi.");return;
            }
            tvRouteRetry=()->routeMarketMarneyTv(target,url,epoch,attempt+1);
            frame.postDelayed(tvRouteRetry,240);
        });
    }
'''
    src = src[:method_start] + local_route + src[method_end:]

    src = once(
        src,
        'if(tab==XAUWAR&&("/index.html".equals(path)||"/".equals(path))){',
        'if(tab==XAUWAR&&"/__android43/marketmarney-tv".equals(path)){',
        'local TV readiness path',
    )

    java.write_text(src, encoding='utf-8')
    html = Path(__file__).with_name('marketmarney-tv.html')
    if not html.is_file():
        raise RuntimeError('missing local TV HTML asset')
    shutil.copyfile(html, root / 'app/src/main/assets/marketmarney-tv.html')
    print('Installed lightweight local MarketMarney TV shell with native public catalogue fallback')


if __name__ == '__main__':
    apply(Path(sys.argv[1] if len(sys.argv) > 1 else 'android438'))
