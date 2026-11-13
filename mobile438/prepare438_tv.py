#!/usr/bin/env python3
"""Marney 4.38: Social login -> Linimasa and resilient MarketMarney TV routing."""
from pathlib import Path


def once(src: str, old: str, new: str, name: str) -> str:
    count = src.count(old)
    if count != 1:
        raise RuntimeError(f"{name}: expected one source anchor, got {count}")
    return src.replace(old, new, 1)


def apply(root: Path) -> None:
    path = root / "app/src/main/java/com/marketmarney/mobile/MainActivity.java"
    src = path.read_text(encoding="utf-8")

    # Keep every existing 4.38 screen and layout; only rename/route tab 2.
    src = once(
        src,
        'private final String[] labels={"Beranda","Berita","XAUWar","Market Live","Social Marney"};',
        'private final String[] labels={"Beranda","Berita","MarketMarney TV","Market Live","Social Marney"};',
        "bottom tab label",
    )
    src = once(
        src,
        'private final String[] paths={"/index.html",NEWS_PATH,XAUWAR_PATH,"/index.html#marketlive","/beranda-trader.html#mm44-feed"};',
        'private final String[] paths={"/index.html",NEWS_PATH,"/index.html#mm-app-tv","/index.html#marketlive","/beranda-trader.html"};',
        "TV and Social destinations",
    )

    old_label = 'TextView title=text(labels[i],10,selected?(lightSocial()?Color.rgb(125,87,25):GOLD):(lightSocial()?Color.rgb(85,104,127):MUTED));title.setSingleLine(true);title.setGravity(Gravity.CENTER);'
    new_label = 'TextView title=text(i==XAUWAR?"MarketMarney\\nTV":labels[i],10,selected?(lightSocial()?Color.rgb(125,87,25):GOLD):(lightSocial()?Color.rgb(85,104,127):MUTED));title.setSingleLine(i!=XAUWAR);if(i==XAUWAR){title.setMaxLines(2);title.setIncludeFontPadding(false);}title.setGravity(Gravity.CENTER);'
    src = once(src, old_label, new_label, "two-line TV label")
    src = once(
        src,
        'cell.addView(iconShell,new LinearLayout.LayoutParams(dp(53),dp(33)));',
        'cell.addView(iconShell,new LinearLayout.LayoutParams(dp(53),dp(i==XAUWAR?29:33)));',
        "TV icon footprint",
    )
    old_icon = 'else if(kind==XAUWAR){q.moveTo(12,2);q.lineTo(21,6);q.lineTo(20,14);q.cubicTo(18,19,15,21,12,23);q.cubicTo(9,21,6,19,4,14);q.lineTo(3,6);q.close();c.drawPath(q,p);c.drawLine(8,8,16,16,p);c.drawLine(16,8,8,16,p);}'
    new_icon = 'else if(kind==XAUWAR){c.drawRoundRect(2,4,22,19,3,3,p);q.moveTo(10,8);q.lineTo(16,11.5f);q.lineTo(10,15);q.close();c.drawPath(q,p);c.drawLine(9,22,15,22,p);}'
    src = once(src, old_icon, new_icon, "TV play icon")

    # Legacy XAUWar links remain trusted website links, but no longer own tab 2.
    old_deeplink = '''                    if(XAUWAR_PAGE.equals(p)){
                        String latest=latestXauWarUrl(u);
                        if(tab!=XAUWAR){navigate(XAUWAR);if(!(BASE+XAUWAR_PATH).equals(latest))open(latest);return true;}
                        if(!latest.equals(u.toString())){open(latest);return true;}
                    }'''
    new_deeplink = '''                    // XAUWar links no longer claim the MarketMarney TV tab.
                    if(XAUWAR_PAGE.equals(p))return false;'''
    src = once(src, old_deeplink, new_deeplink, "legacy XAUWar routing")
    src = once(
        src,
        'if("marketlive".equals(h)&&tab!=MARKET){navigate(MARKET);return true;}',
        'if("marketlive".equals(h)&&tab!=MARKET){navigate(MARKET);return true;}\n                        if("mm-app-tv".equals(h)&&tab!=XAUWAR){navigate(XAUWAR);return true;}',
        "TV hash interception",
    )

    # Wait for the actual current TV catalogue (.mm-tv-grid + video cards), not
    # the old filter selector. This also prevents the homepage flashing as ready.
    old_ready = '''    private void pageReady(WebView target,String url){
        if(target!=web||!own(url)||mainFailed)return;
        firstPaint=true;cancelPageWait();clearOffline();progress.setVisibility(View.GONE);
        if(tab!=SOCIAL&&!socialAssetsReady)frame.postDelayed(this::preloadSocialAssets,650);
    }'''
    new_ready = r'''    private int tvRouteEpoch=0;
    private boolean tvRouteChecking=false;
    private Runnable tvRouteRetry;
    private void cancelTvRoute(){
        if(tvRouteRetry!=null){frame.removeCallbacks(tvRouteRetry);tvRouteRetry=null;}
        tvRouteChecking=false;tvRouteEpoch++;
    }
    private void completePageReady(WebView target,String url){
        if(target!=web||!own(url)||mainFailed)return;
        firstPaint=true;cancelPageWait();clearOffline();progress.setVisibility(View.GONE);
        if(tab!=SOCIAL&&!socialAssetsReady)frame.postDelayed(this::preloadSocialAssets,650);
    }
    private void routeMarketMarneyTv(WebView target,String url,int epoch,int attempt){
        if(destroyed||target!=web||tab!=XAUWAR||mainFailed||epoch!=tvRouteEpoch
            ||!Recovery414.sameDocument(url,target.getUrl())){if(epoch==tvRouteEpoch)tvRouteChecking=false;return;}
        String js="(function(){"
            +"var nav=document.getElementById('nav'),app=document.getElementById('app');"
            +"var b=nav&&nav.querySelector('button[data-page=\"MarketMarney TV\"]');"
            +"if(!b||!app)return 'wait';"
            +"var active=b.classList.contains('active')||b.getAttribute('aria-current')==='page'||b.getAttribute('aria-selected')==='true';"
            +"if(!active){if(!window.__mmAppTvLastClick||Date.now()-window.__mmAppTvLastClick>850){window.__mmAppTvLastClick=Date.now();b.click();}return 'clicked';}"
            +"var grid=app.querySelector('.mm-tv-grid');"
            +"var cards=grid?grid.querySelectorAll('article.mm-tv-card,[data-tv-id]').length:0;"
            +"if(grid&&cards>0&&grid.getBoundingClientRect().height>120){document.documentElement.dataset.mmAppTv='ready';window.scrollTo(0,0);return 'ready:'+cards;}"
            +"var alert=app.querySelector('[role=\"alert\"],.mm-tv-error');"
            +"return alert&&(alert.innerText||'').trim()?'error':'wait';"
            +"})()";
        target.evaluateJavascript(js,value->{
            if(destroyed||target!=web||tab!=XAUWAR||mainFailed||epoch!=tvRouteEpoch
                ||!Recovery414.sameDocument(url,target.getUrl())){if(epoch==tvRouteEpoch)tvRouteChecking=false;return;}
            if(value!=null&&value.startsWith("\"ready:")){
                tvRouteChecking=false;tvRouteRetry=null;
                Log.i("MMAPP_TV","ready catalogue="+value);
                completePageReady(target,url);endLaunchAnimation(true,"tv-ready");return;
            }
            if(attempt>=80){
                tvRouteChecking=false;tvRouteRetry=null;
                Log.e("MMAPP_TV","catalogue timeout state="+value);
                showFailure("TV","MarketMarney TV belum dapat dimuat. Periksa koneksi lalu coba lagi.");return;
            }
            tvRouteRetry=()->routeMarketMarneyTv(target,url,epoch,attempt+1);
            frame.postDelayed(tvRouteRetry,250);
        });
    }
    private void pageReady(WebView target,String url){
        if(target!=web||!own(url)||mainFailed)return;
        String path=Uri.parse(url).getPath();
        if(tab==XAUWAR&&("/index.html".equals(path)||"/".equals(path))){
            if(!tvRouteChecking){
                tvRouteChecking=true;int epoch=++tvRouteEpoch;
                progress.setVisibility(View.VISIBLE);
                routeMarketMarneyTv(target,url,epoch,0);
            }
            return;
        }
        completePageReady(target,url);
    }'''
    src = once(src, old_ready, new_ready, "TV catalogue readiness")

    # Cancel stale TV callbacks on every new navigation and retry the TV route
    # when the selected TV tab is tapped again.
    src = once(
        src,
        '        cancelPageWait();navigationStarted=SystemClock.uptimeMillis();',
        '        cancelPageWait();cancelTvRoute();navigationStarted=SystemClock.uptimeMillis();',
        "cancel stale TV route",
    )
    old_same = '''        if(selected==tab&&!pending&&web!=null&&own(web.getUrl())){
            if(firstPaint){resumePage(web);progress.setVisibility(View.GONE);}else progress.setVisibility(View.VISIBLE);
            drawTabs();Log.i("MM438_NAV","same tab="+tab+" reused");return;
        }'''
    new_same = '''        if(selected==tab&&!pending&&web!=null&&own(web.getUrl())){
            if(tab==XAUWAR){firstPaint=false;resumePage(web);progress.setVisibility(View.VISIBLE);pageReady(web,web.getUrl());}
            else if(firstPaint){resumePage(web);progress.setVisibility(View.GONE);}else progress.setVisibility(View.VISIBLE);
            drawTabs();Log.i("MM438_NAV","same tab="+tab+" reused");return;
        }'''
    src = once(src, old_same, new_same, "same-tab TV retry")
    src = once(
        src,
        '        navigationSequence++;pendingIndexTab=-1;beginPageWait(web);lastUrl=url;clearOffline();web.setVisibility(View.VISIBLE);progress.setVisibility(View.VISIBLE);web.loadUrl(url);',
        '        navigationSequence++;pendingIndexTab=-1;cancelTvRoute();beginPageWait(web);lastUrl=url;clearOffline();web.setVisibility(View.VISIBLE);progress.setVisibility(View.VISIBLE);web.loadUrl(url);',
        "cancel TV route on open",
    )

    # Do not end the opening layer until the TV catalogue is actually visible.
    src = once(
        src,
        '@Override public void onPageCommitVisible(WebView v,String url){if(v==web&&own(url)){pageReady(v,url);endLaunchAnimation(true,"first-frame");}}',
        '@Override public void onPageCommitVisible(WebView v,String url){if(v==web&&own(url)){pageReady(v,url);if(firstPaint)endLaunchAnimation(true,"first-frame");}}',
        "commit-visible readiness",
    )
    src = once(
        src,
        '@Override public void onPageFinished(WebView v,String url){if(v!=web)return;pageReady(v,url);adapt(v,url);endLaunchAnimation(true,"page-finished");}',
        '@Override public void onPageFinished(WebView v,String url){if(v!=web)return;pageReady(v,url);adapt(v,url);if(firstPaint)endLaunchAnimation(true,"page-finished");}',
        "page-finished readiness",
    )

    # On the Social login page, remember an actual form submission. Once the
    # session endpoint confirms the user, replace the account page with Linimasa.
    old_adapt = '''        String socialStyle="var ss=document.getElementById('mm43-social-style');if(!ss){ss=document.createElement('style');ss.id='mm43-social-style';document.head.appendChild(ss)}if(ss.dataset.revision!=='438'){ss.textContent="+socialCssQuoted+";ss.dataset.revision='438';}";
        String install="(function(){if(!("+ready+"))return 'retry';"+common+"\\n"+homeCards+"\\n"+brandingScript+"\\n"+
            depthScript+"\\nif(window.MMDepth423)window.MMDepth423.install("+depthCssQuoted+");\\n"+
            chromeScript+"\\nif(window.MMChrome424)window.MMChrome424.install();\\n"+
            lightScript+"\\nif(window.MMLight425)window.MMLight425.install();var l=document.getElementById('mm425-light');if(!l){l=document.createElement('style');l.id='mm425-light';document.head.appendChild(l)}if(l.dataset.revision!=='438'){l.textContent="+lightCssQuoted+";l.dataset.revision='438';}document.head.appendChild(l);return window.__mm411BundledReady?'bundled':'fallback';})()";'''
    new_adapt = '''        String socialStyle="var ss=document.getElementById('mm43-social-style');if(!ss){ss=document.createElement('style');ss.id='mm43-social-style';document.head.appendChild(ss)}if(ss.dataset.revision!=='438'){ss.textContent="+socialCssQuoted+";ss.dataset.revision='438';}";
        String socialLoginRoute="";
        if(tab==SOCIAL&&!"/beranda-trader.html".equals(path)&&expected.getQueryParameter("pengaturan")==null){
            socialLoginRoute="(function(){var key='mmapp:social-login-pending';var form=document.getElementById('authForm');"
                +"if(form&&!form.dataset.mmAppTimeline){form.dataset.mmAppTimeline='1';form.addEventListener('submit',function(){try{sessionStorage.setItem(key,'1')}catch(e){}},{capture:true});}"
                +"var pending=false;try{pending=sessionStorage.getItem(key)==='1'}catch(e){}if(!pending||window.__mmAppTimelineCheck)return;"
                +"window.__mmAppTimelineCheck=1;var tries=0;function done(){window.__mmAppTimelineCheck=0;}function check(){"
                +"fetch('/api/community/status',{credentials:'same-origin',cache:'no-store'}).then(function(r){if(!r.ok)throw Error('status');return r.json();}).then(function(d){"
                +"if(d&&d.user&&d.user.username){try{sessionStorage.removeItem(key)}catch(e){}location.replace('/beranda-trader.html');return;}"
                +"if(++tries<18)setTimeout(check,500);else done();}).catch(function(){if(++tries<18)setTimeout(check,650);else done();});}check();})();";
        }
        String install="(function(){if(!("+ready+"))return 'retry';"+common+"\\n"+homeCards+"\\n"+brandingScript+"\\n"+
            depthScript+"\\nif(window.MMDepth423)window.MMDepth423.install("+depthCssQuoted+");\\n"+
            chromeScript+"\\nif(window.MMChrome424)window.MMChrome424.install();\\n"+
            lightScript+"\\nif(window.MMLight425)window.MMLight425.install();var l=document.getElementById('mm425-light');if(!l){l=document.createElement('style');l.id='mm425-light';document.head.appendChild(l)}if(l.dataset.revision!=='438'){l.textContent="+lightCssQuoted+";l.dataset.revision='438';}document.head.appendChild(l);"+socialLoginRoute+"return window.__mm411BundledReady?'bundled':'fallback';})()";'''
    src = once(src, old_adapt, new_adapt, "Social login to Linimasa bridge")

    src = once(
        src,
        '@Override protected void onDestroy(){destroyed=true;if(runtimeDispatchTask!=null)frame.removeCallbacks(runtimeDispatchTask);',
        '@Override protected void onDestroy(){destroyed=true;cancelTvRoute();if(runtimeDispatchTask!=null)frame.removeCallbacks(runtimeDispatchTask);',
        "TV cleanup",
    )

    path.write_text(src, encoding="utf-8")
    print("Marney 4.38 preserved; Social login opens Linimasa and TV waits for the real catalogue")


if __name__ == "__main__":
    import sys
    apply(Path(sys.argv[1] if len(sys.argv) > 1 else "android438"))
