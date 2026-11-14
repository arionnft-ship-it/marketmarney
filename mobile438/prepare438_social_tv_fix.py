#!/usr/bin/env python3
"""Stabilize MarketMarney TV and return Social Marney login to the timeline."""
from pathlib import Path


def once(src: str, old: str, new: str, name: str) -> str:
    count = src.count(old)
    if count != 1:
        raise RuntimeError(f"{name}: expected one source anchor, got {count}")
    return src.replace(old, new, 1)


def apply(root: Path) -> None:
    path = root / "app/src/main/java/com/marketmarney/mobile/MainActivity.java"
    src = path.read_text(encoding="utf-8")

    src = once(
        src,
        "    private long adaptSequence;\n    private int pendingIndexTab=-1;",
        """    private long adaptSequence;
    private long tvReadyToken;
    private int tvReadyChecks;
    private boolean tvReadyChecking;
    private boolean socialLoginFlow;
    private long socialLoginToken;
    private int pendingIndexTab=-1;""",
        "TV/login state fields",
    )

    old_ready = '''    private void pageReady(WebView target,String url){
        if(target!=web||!own(url)||mainFailed)return;
        firstPaint=true;cancelPageWait();clearOffline();progress.setVisibility(View.GONE);
        if(tab!=SOCIAL&&!socialAssetsReady)frame.postDelayed(this::preloadSocialAssets,650);
    }'''
    new_ready = '''    private boolean marketmarneyTvDocument(String url){
        if(tab!=XAUWAR||!own(url))return false;
        String path=Uri.parse(url).getPath();
        return "/".equals(path)||"/index.html".equals(path);
    }
    private void resetTvReadyProbe(){tvReadyChecking=false;tvReadyChecks=0;tvReadyToken++;}
    private void completePageReady(WebView target,String url){
        if(target!=web||!own(url)||mainFailed)return;
        firstPaint=true;cancelPageWait();clearOffline();progress.setVisibility(View.GONE);
        if(tab!=SOCIAL&&!socialAssetsReady)frame.postDelayed(this::preloadSocialAssets,650);
    }
    private void probeMarketmarneyTv(WebView target,String url,long token){
        if(destroyed||target!=web||token!=tvReadyToken||!tvReadyChecking||mainFailed||!marketmarneyTvDocument(url))return;
        String js="(function(){var app=document.getElementById('app');if(!app)return false;"
            +"var h=app.querySelector('.pagehead h1'),title=((h&&h.textContent)||'').toLowerCase();"
            +"var filters=app.querySelector('.mm-tv-filters'),grid=app.querySelector('.mm-tv-grid');"
            +"var card=app.querySelector('article.mm-tv-card'),learning=app.querySelector('section.mm-tv-learning');"
            +"return (title.indexOf('marketmarney tv')>=0&&(filters||grid||learning))"
            +"||(filters&&(grid||card||learning)&&(app.innerText||'').toLowerCase().indexOf('marketmarney tv')>=0);})()";
        target.evaluateJavascript(js,value->{
            if(destroyed||target!=web||token!=tvReadyToken||!tvReadyChecking||mainFailed||!marketmarneyTvDocument(url))return;
            if("true".equals(value)){
                tvReadyChecking=false;completePageReady(target,url);endLaunchAnimation(true,"tv-ready");
                Log.i("MMAPP_TV","ready catalogue=MarketMarney TV");return;
            }
            if(++tvReadyChecks>=100){
                tvReadyChecking=false;showFailure("TV","MarketMarney TV belum dapat dimuat. Periksa koneksi lalu tekan Coba lagi.");return;
            }
            frame.postDelayed(()->probeMarketmarneyTv(target,url,token),200);
        });
    }
    private void pageReady(WebView target,String url){
        if(target!=web||!own(url)||mainFailed)return;
        if(marketmarneyTvDocument(url)){
            if(!tvReadyChecking){tvReadyChecking=true;tvReadyChecks=0;long token=++tvReadyToken;probeMarketmarneyTv(target,url,token);}
            return;
        }
        completePageReady(target,url);
    }
    private void beginSocialLoginFlow(){socialLoginFlow=true;socialLoginToken++;}
    private void cancelSocialLoginFlow(){socialLoginFlow=false;socialLoginToken++;}
    private void redirectSocialLoginToTimeline(WebView target,String url){
        if(!socialLoginFlow||tab!=SOCIAL||target!=web||!own(url)||mainFailed)return;
        String path=Uri.parse(url).getPath();
        if("/beranda-trader.html".equals(path)){cancelSocialLoginFlow();return;}
        long token=socialLoginToken;
        String js="(function(){if(window.__mmSocialTimelineProbe&&window.__mmSocialTimelineProbe.active)return;"
            +"var flow={attempts:0,active:true};window.__mmSocialTimelineProbe=flow;"
            +"function check(){if(!flow.active||window.__mmSocialTimelineProbe!==flow)return;"
            +"fetch('/api/community/status',{credentials:'same-origin',cache:'no-store'})"
            +".then(function(r){if(!r.ok)throw new Error('status '+r.status);return r.json();})"
            +".then(function(d){if(!flow.active)return;"
            +"var member=d&&(d.user||(d.data&&d.data.user));"
            +"if(member){flow.active=false;location.replace('/beranda-trader.html#mm44-feed');return;}"
            +"if(++flow.attempts<3)setTimeout(check,500*flow.attempts);else flow.active=false;})"
            +".catch(function(){if(++flow.attempts<8)setTimeout(check,500*flow.attempts);else flow.active=false;});}"
            +"check();})();";
        target.evaluateJavascript(js,value->{
            if(destroyed||target!=web||token!=socialLoginToken||!socialLoginFlow||tab!=SOCIAL)return;
            Log.i("MMAPP_SOCIAL","login flow checks authenticated session and returns to timeline");
        });
    }'''
    src = once(src, old_ready, new_ready, "TV readiness and Social login redirect")

    src = once(
        src,
        '            @Override public void onSignedIn(String username){dropRetained();if(!destroyed&&tab==SOCIAL&&web!=null)web.reload();}\n            @Override public void onSignedOut(){dropRetained();if(!destroyed&&tab==SOCIAL&&web!=null)web.reload();}',
        '            @Override public void onSignedIn(String username){dropRetained();if(!destroyed&&tab==SOCIAL&&web!=null){cancelSocialLoginFlow();open(BASE+paths[SOCIAL]);}}\n            @Override public void onSignedOut(){dropRetained();cancelSocialLoginFlow();if(!destroyed&&tab==SOCIAL&&web!=null)web.reload();}',
        "native login callbacks",
    )

    src = once(
        src,
        '        int initial=state==null?HOME:state.getInt("selectedTab",HOME);',
        '        int initial=state==null?HOME:state.getInt("selectedTab",HOME);\n        if(state!=null)socialLoginFlow=state.getBoolean("socialLoginFlow",false);',
        "restore Social login flow",
    )

    old_same = '''        if(selected==tab&&!pending&&web!=null&&own(web.getUrl())){
            if(firstPaint){resumePage(web);progress.setVisibility(View.GONE);}else progress.setVisibility(View.VISIBLE);
            drawTabs();Log.i("MM438_NAV","same tab="+tab+" reused");return;
        }'''
    new_same = '''        if(selected==tab&&!pending&&web!=null&&own(web.getUrl())){
            if(selected==XAUWAR){resetTvReadyProbe();firstPaint=false;progress.setVisibility(View.VISIBLE);adapt(web,web.getUrl());pageReady(web,web.getUrl());}
            else if(firstPaint){resumePage(web);progress.setVisibility(View.GONE);}else progress.setVisibility(View.VISIBLE);
            drawTabs();Log.i("MM438_NAV","same tab="+tab+" reused");return;
        }'''
    src = once(src, old_same, new_same, "same-tab TV recovery")

    src = once(
        src,
        '        if(selected<0||selected>=labels.length||destroyed)return;\n        boolean pending=pendingIndexTab!=-1;pendingIndexTab=-1;long sequence=++navigationSequence;',
        '        if(selected<0||selected>=labels.length||destroyed)return;\n        if(selected!=SOCIAL)cancelSocialLoginFlow();\n        resetTvReadyProbe();\n        boolean pending=pendingIndexTab!=-1;pendingIndexTab=-1;long sequence=++navigationSequence;',
        "navigation state reset",
    )

    old_warm = '''            lastUrl=own(web.getUrl())?web.getUrl():BASE+paths[tab];resumePage(web);
            progress.setVisibility(View.GONE);
            Log.i("MM45_NAV","warm tab="+tab+" ms="+(SystemClock.uptimeMillis()-navigationStarted));'''
    new_warm = '''            lastUrl=own(web.getUrl())?web.getUrl():BASE+paths[tab];resumePage(web);
            if(tab==XAUWAR){firstPaint=false;progress.setVisibility(View.VISIBLE);adapt(web,lastUrl);pageReady(web,lastUrl);}else progress.setVisibility(View.GONE);
            Log.i("MM45_NAV","warm tab="+tab+" ms="+(SystemClock.uptimeMillis()-navigationStarted));'''
    src = once(src, old_warm, new_warm, "warm TV recovery")

    old_signin = '''    private void signIn(){
        if(!getPackageName().equals("com.marketmarney.mobile")){
            depthDialog(new AlertDialog.Builder(this).setTitle("Login aplikasi beta")
                .setMessage("Google Login belum tersedia di APK beta ini. Jika sebelumnya sudah membuat username dan kata sandi, gunakan keduanya untuk masuk di aplikasi.\\n\\nUntuk akun yang hanya memakai Google, gunakan versi web melalui browser. Login di browser hanya berlaku untuk versi web dan tidak membuat APK ini ikut masuk.")
                .setPositiveButton("Masuk di aplikasi",(d,w)->open(BASE+"/akun.html"))'''
    new_signin = '''    private void signIn(){
        if(!getPackageName().equals("com.marketmarney.mobile")){
            depthDialog(new AlertDialog.Builder(this).setTitle("Login aplikasi beta")
                .setMessage("Google Login belum tersedia di APK beta ini. Jika sebelumnya sudah membuat username dan kata sandi, gunakan keduanya untuk masuk di aplikasi.\\n\\nUntuk akun yang hanya memakai Google, gunakan versi web melalui browser. Login di browser hanya berlaku untuk versi web dan tidak membuat APK ini ikut masuk.")
                .setPositiveButton("Masuk di aplikasi",(d,w)->{beginSocialLoginFlow();open(BASE+"/akun.html");})'''
    src = once(src, old_signin, new_signin, "beta login entry")
    src = once(
        src,
        '        google.signIn();\n    }',
        '        beginSocialLoginFlow();google.signIn();\n    }',
        "native Google login entry",
    )

    src = once(
        src,
        '                    String p=u.getPath()==null?"":u.getPath();\n                    if(NEWS_PATH.equals(p)){navigate(NEWS);return true;}',
        '                    String p=u.getPath()==null?"":u.getPath();\n                    if(tab==SOCIAL&&"/akun.html".equals(p)&&u.getQueryParameter("pengaturan")==null)beginSocialLoginFlow();\n                    if(tab==SOCIAL&&( "/login".equals(p)||p.startsWith("/api/auth/")))beginSocialLoginFlow();\n                    if(NEWS_PATH.equals(p)){navigate(NEWS);return true;}',
        "Social login URL tracking",
    )

    old_started = '''            @Override public void onPageStarted(WebView v,String url,android.graphics.Bitmap favicon){
                if(own(url)){String p=Uri.parse(url).getPath();if("/akun.html".equals(p)||p!=null&&p.startsWith("/api/auth/"))dropRetained();}
                if(v!=web)return;lastAdaptedDocument="";lastRuntimeSignature="";if(pendingIndexTab!=-1){navigationSequence++;pendingIndexTab=-1;}if(fileOwner==v)finishFileSelection(null);clearOffline();beginPageWait(v);progress.setVisibility(View.VISIBLE);if(own(url))lastUrl=url;
            }'''
    new_started = '''            @Override public void onPageStarted(WebView v,String url,android.graphics.Bitmap favicon){
                if(own(url)){String p=Uri.parse(url).getPath();if("/akun.html".equals(p)||p!=null&&p.startsWith("/api/auth/"))dropRetained();if(v==web&&tab==SOCIAL&&( "/login".equals(p)||p!=null&&p.startsWith("/api/auth/")))beginSocialLoginFlow();if(v==web&&"/beranda-trader.html".equals(p))cancelSocialLoginFlow();}
                if(v!=web)return;resetTvReadyProbe();lastAdaptedDocument="";lastRuntimeSignature="";if(pendingIndexTab!=-1){navigationSequence++;pendingIndexTab=-1;}if(fileOwner==v)finishFileSelection(null);clearOffline();beginPageWait(v);progress.setVisibility(View.VISIBLE);if(own(url))lastUrl=url;
            }'''
    src = once(src, old_started, new_started, "page-start flow reset")

    src = once(
        src,
        '            @Override public void onPageCommitVisible(WebView v,String url){if(v==web&&own(url)){pageReady(v,url);endLaunchAnimation(true,"first-frame");}}\n            @Override public void onPageFinished(WebView v,String url){if(v!=web)return;pageReady(v,url);adapt(v,url);endLaunchAnimation(true,"page-finished");}',
        '            @Override public void onPageCommitVisible(WebView v,String url){if(v==web&&own(url)){pageReady(v,url);if(firstPaint)endLaunchAnimation(true,"first-frame");}}\n            @Override public void onPageFinished(WebView v,String url){if(v!=web)return;adapt(v,url);pageReady(v,url);redirectSocialLoginToTimeline(v,url);if(firstPaint)endLaunchAnimation(true,"page-finished");}',
        "page finish handshakes",
    )

    old_tv = '''        String tvRoute="";
        if(tab==XAUWAR&&("/".equals(path)||"/index.html".equals(path))){
            tvRoute="(function(){window.__mmAppTvRoute=window.__mmAppTvRoute||{seq:0};"
                +"var token=++window.__mmAppTvRoute.seq,tries=0;"
                +"function route(){if(!window.__mmAppTvRoute||window.__mmAppTvRoute.seq!==token)return;"
                +"var nav=document.getElementById('nav'),app=document.getElementById('app');"
                +"var b=nav&&nav.querySelector('button[data-page=\\\"MarketMarney TV\\\"]');"
                +"if(!b||!app){if(++tries<72)setTimeout(route,250);return;}"
                +"if(!b.classList.contains('active'))b.click();"
                +"var filters=app.querySelector('.mm-tv-filters');"
                +"if(filters&&(app.innerText||'').indexOf('MarketMarney TV')>=0){"
                +"document.documentElement.dataset.mmAppTv='ready';"
                +"try{window.dispatchEvent(new CustomEvent('mmapp:tv-ready'));}catch(e){}return;}"
                +"if(++tries<72)setTimeout(route,250);"
                +"}route();})();";
            Log.i("MMAPP_TV","route injected tab=2 catalogue=MarketMarney TV");
        }'''
    new_tv = '''        String tvRoute="";
        if(tab==XAUWAR&&("/".equals(path)||"/index.html".equals(path))){
            tvRoute="(function(){var holder=window.__mmAppTvRoute=window.__mmAppTvRoute||{seq:0,timer:0};"
                +"var token=++holder.seq,tries=0,lastClick=0;if(holder.timer)clearTimeout(holder.timer);"
                +"function text(el){return (((el&&el.getAttribute&&el.getAttribute('data-page'))||'')+' '+((el&&el.textContent)||'')).replace(/\\\\s+/g,' ').trim().toUpperCase();}"
                +"function button(){var nav=document.getElementById('nav')||document.querySelector('nav');if(!nav)return null;"
                +"var exact=nav.querySelector('button[data-page=\\\"MarketMarney TV\\\"],button[data-page=\\\"MARKETMARNEY TV\\\"]');if(exact)return exact;"
                +"var list=nav.querySelectorAll('button.navbtn,button[data-page],button');for(var i=0;i<list.length;i++){var label=text(list[i]);if(label==='MARKETMARNEY TV'||label.indexOf('MARKETMARNEY TV')>=0)return list[i];}return null;}"
                +"function ready(){var app=document.getElementById('app');if(!app)return false;var h=app.querySelector('.pagehead h1');"
                +"var title=((h&&h.textContent)||'').toUpperCase();var filters=app.querySelector('.mm-tv-filters'),grid=app.querySelector('.mm-tv-grid');"
                +"var card=app.querySelector('article.mm-tv-card'),learning=app.querySelector('section.mm-tv-learning');"
                +"return (title.indexOf('MARKETMARNEY TV')>=0&&(filters||grid||learning))||(filters&&(grid||card||learning));}"
                +"function finish(){document.documentElement.dataset.mmAppTv='ready';if(holder.timer)clearTimeout(holder.timer);try{window.dispatchEvent(new CustomEvent('mmapp:tv-ready'));}catch(e){}}"
                +"function route(){if(!window.__mmAppTvRoute||holder.seq!==token)return;if(ready()){finish();return;}var b=button(),now=Date.now();"
                +"if(b&&now-lastClick>3000){lastClick=now;try{b.click();}catch(e){try{b.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));}catch(ignore){}}}"
                +"if(!b&&tries>8&&now-lastClick>3000&&typeof window.go==='function'){lastClick=now;try{window.go('MarketMarney TV');}catch(ignore){}}"
                +"if(ready()){finish();return;}if(++tries>=100){document.documentElement.dataset.mmAppTv='error';try{window.dispatchEvent(new CustomEvent('mmapp:tv-error'));}catch(e){}return;}"
                +"holder.timer=setTimeout(route,200);}route();})();";
            Log.i("MMAPP_TV","robust route injected tab=2 selector=navbtn/text");
        }'''
    src = once(src, old_tv, new_tv, "robust TV route")

    src = once(
        src,
        '            @Override public void onProgressChanged(WebView v,int n){if(v!=web)return;progress.setProgress(n);progress.setVisibility(n==100||firstPaint||mainFailed?View.GONE:View.VISIBLE);}',
        '            @Override public void onProgressChanged(WebView v,int n){if(v!=web)return;progress.setProgress(n);boolean waitingTv=tab==XAUWAR&&!firstPaint;progress.setVisibility((n==100&&!waitingTv)||firstPaint||mainFailed?View.GONE:View.VISIBLE);}',
        "TV progress handshake",
    )

    src = once(
        src,
        '    @Override protected void onSaveInstanceState(Bundle state){super.onSaveInstanceState(state);state.putInt("selectedTab",tab);state.putInt("gallerySequence",fileSequence);if(web!=null&&!(tab==MARKET&&(BASE+"/index.html").equals(web.getUrl()))){Bundle b=new Bundle();web.saveState(b);state.putBundle("webHistory",b);}else state.remove("webHistory");}',
        '    @Override protected void onSaveInstanceState(Bundle state){super.onSaveInstanceState(state);state.putInt("selectedTab",tab);state.putInt("gallerySequence",fileSequence);state.putBoolean("socialLoginFlow",socialLoginFlow);if(web!=null&&!(tab==MARKET&&(BASE+"/index.html").equals(web.getUrl()))){Bundle b=new Bundle();web.saveState(b);state.putBundle("webHistory",b);}else state.remove("webHistory");}',
        "save Social login flow",
    )

    src = once(
        src,
        '    @Override protected void onResume(){super.onResume();if(web!=null){resumePage(web);notifyAppVisibility(true);}refreshRuntimeState(false);}',
        '    @Override protected void onResume(){super.onResume();if(web!=null){resumePage(web);notifyAppVisibility(true);if(tab==XAUWAR&&own(web.getUrl())){resetTvReadyProbe();firstPaint=false;progress.setVisibility(View.VISIBLE);adapt(web,web.getUrl());pageReady(web,web.getUrl());}}refreshRuntimeState(false);}',
        "resume TV recovery",
    )

    path.write_text(src, encoding="utf-8")
    print("PASS: Social login returns to timeline; MarketMarney TV uses resilient routing")


if __name__ == "__main__":
    import sys
    apply(Path(sys.argv[1] if len(sys.argv) > 1 else "android438"))
