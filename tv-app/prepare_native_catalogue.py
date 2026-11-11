#!/usr/bin/env python3
"""Android-only native read of public TV metadata with APK snapshot fallback.

No JS bridge, user credentials, token, cookies, or backend mutations.
A bounded HTTPS GET runs on a background thread. The filtered public data
is passed only to the active local-TV WebView through evaluateJavascript.
"""
from pathlib import Path
import sys

def once(s,old,new,name):
    n=s.count(old)
    if n!=1:
        raise RuntimeError(f'{name}: expected exactly one source anchor, found {n}')
    return s.replace(old,new,1)

def apply(root:Path):
    file=root/'app/src/main/java/com/marketmarney/mobile/MainActivity.java'
    s=file.read_text(encoding='utf-8')
    # Implement read-only native fallback. The published media metadata is not
    # sensitive; filter fields, cap bytes and reject network redirects.
    native=r'''    private static String boundedText(InputStream stream,int limit) throws java.io.IOException{
        ByteArrayOutputStream out=new ByteArrayOutputStream();
        byte[] buf=new byte[8192];int n;
        while((n=stream.read(buf))!=-1){
            if(out.size()+n>limit)throw new java.io.IOException("TV catalogue over size cap");
            out.write(buf,0,n);
        }
        return out.toString(StandardCharsets.UTF_8.name());
    }
    private static String publishedTvPayload(String raw) throws Exception{
        JSONObject decoded=new JSONObject(raw);
        org.json.JSONArray source=decoded.optJSONArray("videos");
        if(source==null)throw new java.io.IOException("No public videos array");
        org.json.JSONArray published=new org.json.JSONArray();
        String[] keys={"id","title","cat","date","desc","type","url","thumb","status"};
        for(int i=0;i<source.length()&&i<200;i++){
            JSONObject item=source.optJSONObject(i);
            if(item==null||!"published".equals(item.optString("status")))continue;
            JSONObject clean=new JSONObject();
            for(String key:keys){
                if(item.has(key)&&!item.isNull(key)){
                    Object value=item.get(key);
                    if(value instanceof String)clean.put(key,((String)value).substring(0,Math.min(((String)value).length(),500)));
                    else clean.put(key,value);
                }
            }
            if(clean.optString("title").length()>0&&clean.optString("url").length()>0)published.put(clean);
        }
        if(published.length()==0)throw new java.io.IOException("No published video metadata");
        JSONObject result=new JSONObject();
        result.put("videos",published);
        return result.toString();
    }
    private String tvLiveCatalogue() throws Exception{
        java.net.HttpURLConnection connection=null;
        try{
            java.net.URL address=new java.net.URL("https://marketmarney.com/api/content");
            connection=(java.net.HttpURLConnection)address.openConnection();
            connection.setRequestMethod("GET");
            connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(7000);
            connection.setReadTimeout(9000);
            connection.setUseCaches(false);
            connection.setRequestProperty("Accept","application/json");
            connection.setRequestProperty("Accept-Encoding","identity");
            connection.setRequestProperty("User-Agent","MarketMarney-Android-TV/1.0");
            if(connection.getResponseCode()!=200)throw new java.io.IOException("TV API status not 200");
            String mime=connection.getContentType();
            if(mime==null||!mime.toLowerCase(java.util.Locale.ROOT).contains("json"))
                throw new java.io.IOException("TV API content type not JSON");
            try(InputStream in=connection.getInputStream()){
                return publishedTvPayload(boundedText(in,2_000_000));
            }
        }finally{if(connection!=null)connection.disconnect();}
    }
    private void requestNativeTvCatalogue(WebView target,String url){
        if(destroyed||target!=web||tab!=XAUWAR||!own(url)
            ||!"/__android43/marketmarney-tv".equals(Uri.parse(url).getPath()))return;
        final long token=xauContentToken;
        Thread request=new Thread(()->{
            String payload=null;String source="native-live";
            try{
                payload=tvLiveCatalogue();
            }catch(Exception e){
                source="bundled-snapshot";
                Log.w("MMAPP_TV_NET","Live catalogue unavailable; using bundled public snapshot");
                try(InputStream in=getAssets().open("marketmarney-tv-catalogue.json")){
                    payload=publishedTvPayload(boundedText(in,400_000));
                }catch(Exception unavailable){
                    Log.e("MMAPP_TV_NET","No valid public TV snapshot in APK");
                    return;
                }
            }
            final String safePayload=payload, safeSource=source;
            runOnUiThread(()->{
                if(destroyed||tab!=XAUWAR||web!=target||xauContentToken!=token
                    ||!own(target.getUrl())||!"/__android43/marketmarney-tv".equals(Uri.parse(target.getUrl()).getPath()))return;
                target.evaluateJavascript("try{if(document.documentElement.dataset.mmTvStatus!=='ready'&&window.MMNativeTvReceive){"
                    +"window.MMNativeTvReceive("+JSONObject.quote(safePayload)+","
                    +JSONObject.quote(safeSource)+")}}catch(e){}",null);
                Log.i("MMAPP_TV_NET","catalogue delivered source="+safeSource);
            });
        },"MarneyTvPublicCatalog");
        request.setDaemon(true);
        request.start();
    }
'''
    anchor='    private int tvRoutePolls=0;'
    s=once(s,anchor,native+anchor,'insert read-only Android TV client')
    old='''            @Override public void onPageFinished(WebView v,String url){if(v!=web)return;pageReady(v,url);adapt(v,url);endLaunchAnimation(true,"page-finished");}'''
    new='''            @Override public void onPageFinished(WebView v,String url){
                if(v!=web)return;
                if(tab==XAUWAR&&own(url)&&"/__android43/marketmarney-tv".equals(Uri.parse(url).getPath()))
                    requestNativeTvCatalogue(v,url);
                pageReady(v,url);adapt(v,url);endLaunchAnimation(true,"page-finished");
            }'''
    s=once(s,old,new,'start native TV catalogue on local page finished')
    file.write_text(s,encoding='utf-8')
    print('Android TV read-only native HTTPS + verified public snapshot fallback applied')

if __name__=="__main__":
    apply(Path(sys.argv[1] if len(sys.argv)>1 else "android439"))
