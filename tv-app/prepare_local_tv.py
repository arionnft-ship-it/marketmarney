#!/usr/bin/env python3
"""Serve Android TV from a lightweight same-origin asset; keep live videos API.

The public homepage is 142 KB and may stall in Android WebView. Using a local
HTML shell for the TV tab avoids a blank tab while retaining live published
MarketMarney TV video metadata and playback from its existing /api/content API.
This is Android candidate only, with strict source anchors.
"""
from pathlib import Path
import shutil
import sys

def once(text, old, new, label):
    num=text.count(old)
    if num!=1:raise RuntimeError(f'{label}: expected 1 source anchor, found {num}')
    return text.replace(old,new,1)

def apply(root:Path):
    path=root/'app/src/main/java/com/marketmarney/mobile/MainActivity.java'
    src=path.read_text(encoding='utf-8')

    src=once(src,'"/index.html#mm-app-tv"','"/__android43/marketmarney-tv"','local TV destination')

    anchor='''                if(own(u)&&NEWS_PATH.equals(u.getPath())&&"GET".equals(req.getMethod())){'''
    intercept='''                if(own(u)&&"/__android43/marketmarney-tv".equals(u.getPath())&&"GET".equals(req.getMethod())){
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
    src=once(src,anchor,intercept+anchor,'TV same-origin local intercept')
    src=once(src,
       'if(tab==XAUWAR&&("/index.html".equals(Uri.parse(url).getPath())||"/".equals(Uri.parse(url).getPath()))){',
       'if(tab==XAUWAR&&"/__android43/marketmarney-tv".equals(Uri.parse(url).getPath())){',
       'TV local page readiness')
    src=once(src,
       'if("mm-app-tv".equals(h)&&tab!=XAUWAR){navigate(XAUWAR);return true;}',
       'if("mm-app-tv".equals(h)&&tab!=XAUWAR){navigate(XAUWAR);return true;}',
       'legacy TV hash handling')
    start=src.index('    private void probeMarketmarneyTv(WebView target,String url,long token){')
    end=src.index('    private void pageReady(WebView target,String url){',start)
    updated=r'''    private void probeMarketmarneyTv(WebView target,String url,long token){
        if(destroyed||target!=web||tab!=XAUWAR||firstPaint||mainFailed||token!=xauContentToken
            ||!Recovery414.sameDocument(url,lastUrl))return;
        // Only the Android-local TV shell is used. Its videos and thumbnails
        // still come from the published /api/content endpoint on MarketMarney.
        String js="(function(){var el=document.getElementById('mm-tv-root');"
            +"if(!el||el.getBoundingClientRect().height<150)return 'wait';"
            +"var state=document.documentElement.dataset.mmTvStatus;"
            +"return state==='ready'?'ready':state==='error'?'error':'shell';})()";
        target.evaluateJavascript(js,value->{
            if(destroyed||target!=web||tab!=XAUWAR||firstPaint||mainFailed||token!=xauContentToken
                ||!Recovery414.sameDocument(url,lastUrl))return;
            if("\"ready\"".equals(value)){
                Log.i("MMAPP_TV","ready tab=2 catalogue=MarketMarney TV");
                completePageReady(target,url);return;
            }
            // The shell or a failed WebView fetch does NOT count as a loaded
            // TV catalogue: give the native read/snapshot fallback time.
            if(tvRoutePolls==20||tvRoutePolls==50){
                Log.i("MMAPP_TV","waiting tab=2 public catalogue status="+value);
            }
            if(++tvRoutePolls>=100){
                Log.e("MMAPP_TV","catalogue timeout; no published videos rendered");
                showFailure("EMPTY","Daftar video MarketMarney TV belum dapat ditampilkan.");
                return;
            }
            frame.postDelayed(()->probeMarketmarneyTv(target,url,token),240);
        });
    }
'''
    src=src[:start]+updated+src[end:]
    path.write_text(src,encoding='utf-8')
    asset=Path(__file__).with_name('marketmarney-tv.html')
    if not asset.is_file():raise RuntimeError('Missing TV HTML asset')
    shutil.copyfile(asset,root/'app/src/main/assets/marketmarney-tv.html')
    print('Android TV local shell installed: /__android43/marketmarney-tv with live /api/content videos')

if __name__=='__main__':
    apply(Path(sys.argv[1] if len(sys.argv)>1 else 'android439'))
