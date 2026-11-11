#!/usr/bin/env python3
"""APK-only lightweight Home for MarketMarney Android; never changes live web/data.

Apply after playstore/prepare_play_candidate.py and all three TV preparation
scripts. Anchors are verified; unexpected native source drift fails closed.
"""
from pathlib import Path
import shutil
import sys


def once(text: str, old: str, new: str, name: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{name}: expected one exact anchor, found {count}")
    return text.replace(old, new, 1)


def apply(root: Path) -> None:
    java = root / "app/src/main/java/com/marketmarney/mobile/MainActivity.java"
    s = java.read_text(encoding="utf-8")
    s = once(
        s, 'private final String[] paths={"/index.html",NEWS_PATH,"/__android43/marketmarney-tv","/index.html#marketlive","/beranda-trader.html#mm44-feed"};',
        'private final String[] paths={"/__android43/home",NEWS_PATH,"/__android43/marketmarney-tv","/index.html#marketlive","/beranda-trader.html#mm44-feed"};',
        "APK Home path (other tabs unchanged)",
    )

    tv_intercept = '''                if(own(u)&&"/__android43/marketmarney-tv".equals(u.getPath())&&"GET".equals(req.getMethod())){'''
    home_intercept = '''                if(own(u)&&"/__android43/home".equals(u.getPath())&&"GET".equals(req.getMethod())){
                    try{
                        WebResourceResponse r=new WebResourceResponse("text/html","UTF-8",getAssets().open("marketmarney-home.html"));
                        Map<String,String> h=new HashMap<>();
                        h.put("Cache-Control","no-store");
                        h.put("X-Content-Type-Options","nosniff");
                        h.put("Content-Security-Policy","default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' https: data:; base-uri 'none'; object-src 'none'; form-action 'none'");
                        r.setResponseHeaders(h);return r;
                    }catch(Exception e){
                        return new WebResourceResponse("text/plain","UTF-8",
                            new ByteArrayInputStream("Beranda MarketMarney belum tersedia.".getBytes(StandardCharsets.UTF_8)));
                    }
                }
'''
    s = once(s, tv_intercept, home_intercept + tv_intercept, "local HTML interceptor")

    override = '''                    if(NEWS_PATH.equals(p)){navigate(NEWS);return true;}'''
    s = once(
        s, override,
        '''                    if("/__android43/home".equals(p)&&tab!=HOME){navigate(HOME);return true;}
                    if("/__android43/marketmarney-tv".equals(p)&&tab!=XAUWAR){navigate(XAUWAR);return true;}
''' + override,
        "same-origin APK routes",
    )

    page_ready = '''    private void pageReady(WebView target,String url){
        if(target!=web||!own(url)||mainFailed)return;
        if(tab==XAUWAR&&"/__android43/marketmarney-tv".equals(Uri.parse(url).getPath())){'''
    new_page_ready = '''    private int homeProbePolls=0;
    private void probeLightHome(WebView target,String url,long token){
        if(destroyed||target!=web||tab!=HOME||firstPaint||mainFailed
            ||token!=xauContentToken||!Recovery414.sameDocument(url,lastUrl))return;
        String js="(function(){var home=document.getElementById('mm-home-root');"
            +"var card=home&&home.querySelector('.hero');"
            +"if(!home||!card||document.documentElement.dataset.mmHomeReady!=='true')return false;"
            +"var b=card.getBoundingClientRect(),s=getComputedStyle(card);"
            +"return b.width>180&&b.height>140&&b.top<innerHeight"
            +"&&s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)>.5"
            +"&&home.querySelectorAll('a.action').length>=2;})()";
        target.evaluateJavascript(js,result->{
            if(destroyed||target!=web||tab!=HOME||firstPaint||mainFailed
                ||token!=xauContentToken||!Recovery414.sameDocument(url,lastUrl))return;
            if("true".equals(result)){
                Log.i("MMAPP_HOME","ready tab=0 lightweight-home");
                completePageReady(target,url);return;
            }
            if(++homeProbePolls>=65){
                showFailure("EMPTY","Beranda belum dapat ditampilkan. Coba lagi.");
                return;
            }
            frame.postDelayed(()->probeLightHome(target,url,token),200);
        });
    }
    private void pageReady(WebView target,String url){
        if(target!=web||!own(url)||mainFailed)return;
        if(tab==HOME&&"/__android43/home".equals(Uri.parse(url).getPath())){
            if(!xauContentProbeStarted){
                xauContentProbeStarted=true;homeProbePolls=0;
                probeLightHome(target,url,xauContentToken);
            }
            return;
        }
        if(tab==XAUWAR&&"/__android43/marketmarney-tv".equals(Uri.parse(url).getPath())){'''
    s = once(s, page_ready, new_page_ready, "Home rendered card readiness")

    # The standalone pages contain their own light styles and scripts. Injecting
    # website/Reels scripts into them adds cost and could hide standalone content.
    adapt = '    private void adapt(WebView v,String url){'
    s = once(
        s, adapt,
        '''    private void adapt(WebView v,String url){
        if(own(url)){
            String localPath=Uri.parse(url).getPath();
            if("/__android43/home".equals(localPath)
                ||"/__android43/marketmarney-tv".equals(localPath))return;
        }''',
        "skip heavy web adaptation for local pages",
    )
    # Do not show a native full-screen opening overlay on the light Home.
    # The legacy opening temporarily hides all descendants from Android
    # accessibility; delayed overlay teardown can leave an otherwise-ready
    # WebView blank/undiscoverable for startup users.
    s = once(
        s, 'if(state==null&&!getIntent().hasExtra("startTab"))showLaunchAnimation();',
        'if(state==null&&!getIntent().hasExtra("startTab")&&initial!=HOME)showLaunchAnimation();',
        "nonblocking light Home launch",
    )
    java.write_text(s, encoding="utf-8")

    source = Path(__file__).with_name("home.html")
    if not source.is_file():
        raise RuntimeError("Missing light-only packaged Home HTML")
    dest = root / "app/src/main/assets/marketmarney-home.html"
    shutil.copyfile(source, dest)
    print("PASS: Android-only fast Home installed; website, account data and TV untouched")


if __name__ == "__main__":
    apply(Path(sys.argv[1] if len(sys.argv) > 1 else "android439"))
