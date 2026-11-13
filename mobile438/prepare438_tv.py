#!/usr/bin/env python3
"""Keep the approved Marney 4.38 UI while fixing Social login return and TV routing."""
from pathlib import Path


def once(src: str, old: str, new: str, name: str) -> str:
    count = src.count(old)
    if count != 1:
        raise RuntimeError(f"{name}: expected one source anchor, got {count}")
    return src.replace(old, new, 1)


def apply(root: Path) -> None:
    path = root / "app/src/main/java/com/marketmarney/mobile/MainActivity.java"
    src = path.read_text(encoding="utf-8")

    # Keep the original tab index/layout. Only rename tab 2 and use the site's
    # canonical hash route instead of the former internal bridge hash.
    src = once(
        src,
        'private static final String XAUWAR_PATH = XAUWAR_PAGE + "?v=" + XAUWAR_VERSION;',
        'private static final String XAUWAR_PATH = XAUWAR_PAGE + "?v=" + XAUWAR_VERSION;\n'
        '    private static final String SOCIAL_FEED_PATH = "/beranda-trader.html#mm44-feed";',
        "social feed constant",
    )
    src = once(
        src,
        'private final String[] labels={"Beranda","Berita","XAUWar","Market Live","Social Marney"};',
        'private final String[] labels={"Beranda","Berita","MarketMarney TV","Market Live","Social Marney"};',
        "bottom tab label",
    )
    src = once(
        src,
        'private final String[] paths={"/index.html",NEWS_PATH,XAUWAR_PATH,"/index.html#marketlive","/beranda-trader.html#mm44-feed"};',
        'private final String[] paths={"/index.html",NEWS_PATH,"/index.html#tv","/index.html#marketlive",SOCIAL_FEED_PATH};\n'
        '    private boolean socialLoginReturnPending=false;',
        "canonical TV and Social routes",
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

    # Tapping an already-selected TV tab re-applies the route instead of leaving
    # a stale player/detail/error state on screen.
    src = once(
        src,
        '''        if(selected==tab&&!pending&&web!=null&&own(web.getUrl())){
            if(firstPaint){resumePage(web);progress.setVisibility(View.GONE);}else progress.setVisibility(View.VISIBLE);
            drawTabs();Log.i("MM438_NAV","same tab="+tab+" reused");return;
        }''',
        '''        if(selected==tab&&!pending&&web!=null&&own(web.getUrl())){
            if(selected==XAUWAR){
                Uri current=Uri.parse(web.getUrl());
                String fragment=current.getFragment();
                if(!(("/index.html".equals(current.getPath())||"/".equals(current.getPath()))&&"tv".equals(fragment))){
                    open(BASE+paths[XAUWAR]);return;
                }
                adapt(web,web.getUrl());
            }
            if(firstPaint){resumePage(web);progress.setVisibility(View.GONE);}else progress.setVisibility(View.VISIBLE);
            drawTabs();Log.i("MM438_NAV","same tab="+tab+" reused");return;
        }''',
        "same-tab TV repair",
    )

    # Legacy XAUWar links remain ordinary trusted links and no longer claim tab 2.
    old_deeplink = '''                    if(XAUWAR_PAGE.equals(p)){
                        String latest=latestXauWarUrl(u);
                        if(tab!=XAUWAR){navigate(XAUWAR);if(!(BASE+XAUWAR_PATH).equals(latest))open(latest);return true;}
                        if(!latest.equals(u.toString())){open(latest);return true;}
                    }'''
    new_deeplink = '''                    // XAUWar links no longer claim the MarketMarney TV tab.
                    if(XAUWAR_PAGE.equals(p))return false;'''
    src = once(src, old_deeplink, new_deeplink, "legacy XAUWar routing")

    # Helpers keep all Social sign-in paths pointed at the timeline while
    # preserving explicit profile/settings navigation.
    old_open = '''    private void open(String url){
        if(web==null||!own(url))return;
        String current=web.getUrl();
        if(url.equals(current)&&!mainFailed){lastUrl=url;if(firstPaint){clearOffline();progress.setVisibility(View.GONE);resumePage(web);}return;}
        navigationSequence++;pendingIndexTab=-1;beginPageWait(web);lastUrl=url;clearOffline();web.setVisibility(View.VISIBLE);progress.setVisibility(View.VISIBLE);web.loadUrl(url);
    }
    private void signIn(){'''
    new_open = '''    private void open(String url){
        if(web==null||!own(url))return;
        String current=web.getUrl();
        if(url.equals(current)&&!mainFailed){lastUrl=url;if(firstPaint){clearOffline();progress.setVisibility(View.GONE);resumePage(web);}return;}
        navigationSequence++;pendingIndexTab=-1;beginPageWait(web);lastUrl=url;clearOffline();web.setVisibility(View.VISIBLE);progress.setVisibility(View.VISIBLE);web.loadUrl(url);
    }
    private String socialLoginUrl(Uri requested){
        Uri source=own(requested)&&"/akun.html".equals(requested.getPath())?requested:Uri.parse(BASE+"/akun.html");
        Uri.Builder next=source.buildUpon().clearQuery();
        for(String name:source.getQueryParameterNames()){
            if(!"next".equals(name))for(String value:source.getQueryParameters(name))next.appendQueryParameter(name,value);
        }
        next.appendQueryParameter("next",SOCIAL_FEED_PATH);
        return next.build().toString();
    }
    private String socialLoginUrl(){return socialLoginUrl(Uri.parse(BASE+"/akun.html"));}
    private boolean profileSettings(Uri u){return u!=null&&"1".equals(u.getQueryParameter("pengaturan"));}
    private void returnToSocialFeed(){
        socialLoginReturnPending=false;if(destroyed)return;
        if(tab!=SOCIAL||web==null){navigate(SOCIAL);return;}
        open(BASE+SOCIAL_FEED_PATH);
    }
    private void signIn(){'''
    src = once(src, old_open, new_open, "Social login helpers")

    # The beta dialog previously opened /akun.html without a return target.
    src = once(
        src,
        '.setPositiveButton("Masuk di aplikasi",(d,w)->open(BASE+"/akun.html"))',
        '.setPositiveButton("Masuk di aplikasi",(d,w)->{socialLoginReturnPending=tab==SOCIAL;open(socialLoginReturnPending?socialLoginUrl():BASE+"/akun.html");})',
        "beta login target",
    )
    src = once(
        src,
        'Intent browser=new Intent(Intent.ACTION_VIEW,Uri.parse(BASE+"/akun.html"));',
        'Intent browser=new Intent(Intent.ACTION_VIEW,Uri.parse(tab==SOCIAL?socialLoginUrl():BASE+"/akun.html"));',
        "browser login target",
    )

    src = once(
        src,
        '@Override public void onSignedIn(String username){dropRetained();if(!destroyed&&tab==SOCIAL&&web!=null)web.reload();}',
        '@Override public void onSignedIn(String username){dropRetained();if(!destroyed){if(tab==SOCIAL||socialLoginReturnPending)returnToSocialFeed();else if(web!=null)web.reload();}}',
        "native Google login return",
    )

    # Normalize every account/login URL opened from Social. Settings URLs keep
    # their existing destination. A successful bare return becomes #mm44-feed.
    src = once(
        src,
        '''                    if(p.startsWith("/api/auth/google/start")){signIn();return true;}
                    if("/index.html".equals(p)||"/".equals(p)){
                        String h=u.getFragment();
                        if("mm-app-home".equals(h)){navigate(HOME);return true;}
                        if("berita".equals(h)){navigate(NEWS);return true;}
                        if("marketlive".equals(h)&&tab!=MARKET){navigate(MARKET);return true;}
                    }
                    if(("/beranda-trader.html".equals(p)||"/grup-trader.html".equals(p))&&tab!=SOCIAL){navigate(SOCIAL);if(u.getQuery()!=null||u.getFragment()!=null||"/grup-trader.html".equals(p))open(u.toString());return true;}''',
        '''                    if("/akun.html".equals(p)&&tab==SOCIAL&&!profileSettings(u)){
                        socialLoginReturnPending=true;
                        String next=u.getQueryParameter("next");
                        if(next==null||next.trim().isEmpty()){open(socialLoginUrl(u));return true;}
                    }
                    if(p.startsWith("/api/auth/google/start")){if(tab==SOCIAL)socialLoginReturnPending=true;signIn();return true;}
                    if("/index.html".equals(p)||"/".equals(p)){
                        String h=u.getFragment();
                        if("mm-app-home".equals(h)){navigate(HOME);return true;}
                        if("berita".equals(h)){navigate(NEWS);return true;}
                        if("marketlive".equals(h)&&tab!=MARKET){navigate(MARKET);return true;}
                        if(("tv".equals(h)||"mm-app-tv".equals(h))&&tab!=XAUWAR){navigate(XAUWAR);return true;}
                    }
                    if("/beranda-trader.html".equals(p)&&tab==SOCIAL&&socialLoginReturnPending){
                        String h=u.getFragment();
                        boolean directFeed=u.getQueryParameter("post")==null&&u.getQueryParameter("chat")==null&&u.getQueryParameter("reel")==null;
                        if(directFeed&&!"mm44-feed".equals(h)){socialLoginReturnPending=false;open(BASE+SOCIAL_FEED_PATH);return true;}
                        if("mm44-feed".equals(h))socialLoginReturnPending=false;
                    }
                    if(("/beranda-trader.html".equals(p)||"/grup-trader.html".equals(p))&&tab!=SOCIAL){socialLoginReturnPending=false;navigate(SOCIAL);if(u.getQuery()!=null||u.getFragment()!=null||"/grup-trader.html".equals(p))open(u.toString());return true;}''',
        "Social return and canonical TV hash interception",
    )

    # Keep the pending return through page loads and clear it only when the feed
    # is actually reached.
    src = once(
        src,
        '''            @Override public void onPageStarted(WebView v,String url,android.graphics.Bitmap favicon){
                if(own(url)){String p=Uri.parse(url).getPath();if("/akun.html".equals(p)||p!=null&&p.startsWith("/api/auth/"))dropRetained();}
                if(v!=web)return;''',
        '''            @Override public void onPageStarted(WebView v,String url,android.graphics.Bitmap favicon){
                if(own(url)){
                    Uri started=Uri.parse(url);String p=started.getPath();
                    if("/akun.html".equals(p)||p!=null&&p.startsWith("/api/auth/"))dropRetained();
                    if(tab==SOCIAL&&"/akun.html".equals(p)&&!profileSettings(started))socialLoginReturnPending=true;
                    if("/beranda-trader.html".equals(p)&&"mm44-feed".equals(started.getFragment()))socialLoginReturnPending=false;
                }
                if(v!=web)return;''',
        "Social login page state",
    )

    # TV video/player pages can play after one user action without a second tap.
    src = once(
        src,
        'v.getSettings().setMediaPlaybackRequiresUserGesture(!"/beranda-trader.html".equals(expected.getPath()));',
        'v.getSettings().setMediaPlaybackRequiresUserGesture(!(tab==XAUWAR||"/beranda-trader.html".equals(expected.getPath())));',
        "TV media playback",
    )

    # Use #tv (the public website route), then keep a bounded fallback that can
    # recover if the SPA router is late or changes its active-state attribute.
    old_adapt = '''        String socialStyle="var ss=document.getElementById('mm43-social-style');if(!ss){ss=document.createElement('style');ss.id='mm43-social-style';document.head.appendChild(ss)}if(ss.dataset.revision!=='438'){ss.textContent="+socialCssQuoted+";ss.dataset.revision='438';}";
        String install="(function(){if(!("+ready+"))return 'retry';"+common+"\\n"+homeCards+"\\n"+brandingScript+"\\n"+
            depthScript+"\\nif(window.MMDepth423)window.MMDepth423.install("+depthCssQuoted+");\\n"+
            chromeScript+"\\nif(window.MMChrome424)window.MMChrome424.install();\\n"+
            lightScript+"\\nif(window.MMLight425)window.MMLight425.install();var l=document.getElementById('mm425-light');if(!l){l=document.createElement('style');l.id='mm425-light';document.head.appendChild(l)}if(l.dataset.revision!=='438'){l.textContent="+lightCssQuoted+";l.dataset.revision='438';}document.head.appendChild(l);return window.__mm411BundledReady?'bundled':'fallback';})()";'''
    new_adapt = '''        String socialStyle="var ss=document.getElementById('mm43-social-style');if(!ss){ss=document.createElement('style');ss.id='mm43-social-style';document.head.appendChild(ss)}if(ss.dataset.revision!=='438'){ss.textContent="+socialCssQuoted+";ss.dataset.revision='438';}";
        String socialReturn="";
        if(tab==SOCIAL&&socialLoginReturnPending&&"/akun.html".equals(path)&&!profileSettings(expected)){
            socialReturn="(function(){if(window.__mmAppSocialFeedReturn)return;window.__mmAppSocialFeedReturn=true;"
                +"var checks=0;function done(){location.replace('"+SOCIAL_FEED_PATH+"');}"
                +"function go(e){if(e&&e.detail&&e.detail.user)done();}"
                +"function check(){if(document.documentElement.dataset.mmAuthState==='authenticated'){done();return;}if(++checks<80)setTimeout(check,250);}"
                +"document.addEventListener('mm80-account-session',go);"
                +"document.addEventListener('mm36-account-login',function(){setTimeout(done,80);});setTimeout(check,150);"
                +"})();";
        }
        String tvRoute="";
        if(tab==XAUWAR&&("/".equals(path)||"/index.html".equals(path))){
            tvRoute="(function(){window.__mmAppTvRoute=window.__mmAppTvRoute||{seq:0};"
                +"var token=++window.__mmAppTvRoute.seq,tries=0;"
                +"function route(){if(!window.__mmAppTvRoute||window.__mmAppTvRoute.seq!==token)return;"
                +"if(location.hash!=='#tv'){history.replaceState(history.state,'',location.pathname+location.search+'#tv');try{window.dispatchEvent(new HashChangeEvent('hashchange'));}catch(e){window.dispatchEvent(new Event('hashchange'));}}"
                +"var nav=document.getElementById('nav'),app=document.getElementById('app')||document.querySelector('main');"
                +"var b=(nav&&nav.querySelector('button[data-page=\\\"MarketMarney TV\\\"],a[href=\\\"#tv\\\"]'))||document.querySelector('[data-page=\\\"MarketMarney TV\\\"]');"
                +"var text=app?(app.innerText||'').toLowerCase():'';"
                +"var ready=!!(app&&app.querySelector('.mm-tv-filters,.mm-tv-grid,.mm-tv-card,[data-tv-card],iframe[src*=\\\"youtube\\\"],video'))"
                +"||(text.indexOf('marketmarney tv')>=0&&(text.indexOf('album video')>=0||text.indexOf('semua video')>=0||text.indexOf('academy')>=0));"
                +"if(ready){document.documentElement.dataset.mmAppTv='ready';try{window.dispatchEvent(new CustomEvent('mmapp:tv-ready'));}catch(e){}return;}"
                +"if(b&&b.isConnected&&(tries===0||tries%8===0))try{b.click();}catch(e){}"
                +"if(++tries<80)setTimeout(route,250);else document.documentElement.dataset.mmAppTv='fallback';"
                +"}route();})();";
            Log.i("MMAPP_TV","canonical route injected hash=tv tab=2");
        }
        String install="(function(){if(!("+ready+"))return 'retry';"+common+"\\n"+homeCards+"\\n"+brandingScript+"\\n"+
            depthScript+"\\nif(window.MMDepth423)window.MMDepth423.install("+depthCssQuoted+");\\n"+
            chromeScript+"\\nif(window.MMChrome424)window.MMChrome424.install();\\n"+
            lightScript+"\\nif(window.MMLight425)window.MMLight425.install();var l=document.getElementById('mm425-light');if(!l){l=document.createElement('style');l.id='mm425-light';document.head.appendChild(l)}if(l.dataset.revision!=='438'){l.textContent="+lightCssQuoted+";l.dataset.revision='438';}document.head.appendChild(l);"+socialReturn+tvRoute+"return window.__mm411BundledReady?'bundled':'fallback';})()";'''
    src = once(src, old_adapt, new_adapt, "Social return and canonical TV adaptation")

    # Preserve the pending Social return during rotation/process recreation.
    src = once(
        src,
        'int initial=state==null?HOME:state.getInt("selectedTab",HOME);',
        'socialLoginReturnPending=state!=null&&state.getBoolean("socialLoginReturnPending",false);\n        int initial=state==null?HOME:state.getInt("selectedTab",HOME);',
        "restore Social return",
    )
    src = once(
        src,
        '@Override protected void onSaveInstanceState(Bundle state){super.onSaveInstanceState(state);state.putInt("selectedTab",tab);state.putInt("gallerySequence",fileSequence);if(web!=null&&!(tab==MARKET&&(BASE+"/index.html").equals(web.getUrl()))){Bundle b=new Bundle();web.saveState(b);state.putBundle("webHistory",b);}else state.remove("webHistory");}',
        '@Override protected void onSaveInstanceState(Bundle state){super.onSaveInstanceState(state);state.putInt("selectedTab",tab);state.putInt("gallerySequence",fileSequence);state.putBoolean("socialLoginReturnPending",socialLoginReturnPending);if(web!=null&&!(tab==MARKET&&(BASE+"/index.html").equals(web.getUrl()))){Bundle b=new Bundle();web.saveState(b);state.putBundle("webHistory",b);}else state.remove("webHistory");}',
        "save Social return",
    )

    path.write_text(src, encoding="utf-8")
    print("Marney 4.38 UI retained; Social login returns to feed and TV uses canonical #tv route")


if __name__ == "__main__":
    import sys
    apply(Path(sys.argv[1] if len(sys.argv) > 1 else "android438"))
