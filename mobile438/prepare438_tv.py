#!/usr/bin/env python3
"""Keep Marney 4.38 UI, route Social login to timeline, and harden MarketMarney TV."""
from pathlib import Path


def once(src: str, old: str, new: str, name: str) -> str:
    count = src.count(old)
    if count != 1:
        raise RuntimeError(f"{name}: expected one source anchor, got {count}")
    return src.replace(old, new, 1)


def patch_social_assets(root: Path) -> None:
    assets = root / "app/src/main/assets"
    account_target = "/akun.html?next=%2Fberanda-trader.html%23mm44-feed"
    google_target = "/api/auth/google/start?next=%2Fberanda-trader.html%23mm44-feed"
    for relative in ("social44.js", "social411/app.js", "social411/bundle427.js"):
        path = assets / relative
        src = path.read_text(encoding="utf-8")
        src = once(
            src,
            "function login(){location.href='/akun.html';}",
            f"function login(){{location.href='{account_target}';}}",
            f"{relative} protected-action login return",
        )
        src = once(
            src,
            "if(email)email.textContent='Masuk dengan email / daftar';",
            f"if(email){{email.textContent='Masuk dengan email / daftar';email.href='{account_target}';}}",
            f"{relative} guest login return",
        )
        src = once(
            src,
            "g.href='/api/auth/google/start';",
            f"g.href='{google_target}';",
            f"{relative} Google login return",
        )
        path.write_text(src, encoding="utf-8")


def apply(root: Path) -> None:
    patch_social_assets(root)
    path = root / "app/src/main/java/com/marketmarney/mobile/MainActivity.java"
    src = path.read_text(encoding="utf-8")

    # Preserve the original 4.38 tab index, layout, styling, and all other tabs.
    src = once(
        src,
        'private final String[] labels={"Beranda","Berita","XAUWar","Market Live","Social Marney"};',
        'private final String[] labels={"Beranda","Berita","MarketMarney TV","Market Live","Social Marney"};',
        "bottom tab label",
    )
    src = once(
        src,
        'private final String[] paths={"/index.html",NEWS_PATH,XAUWAR_PATH,"/index.html#marketlive","/beranda-trader.html#mm44-feed"};',
        'private final String[] paths={"/index.html",NEWS_PATH,"/index.html#mm-app-tv","/index.html#marketlive","/beranda-trader.html#mm44-feed"};',
        "bottom tab route",
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

    # Legacy XAUWar links remain ordinary trusted links and no longer claim tab 2.
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

    # Native Google/email fallback also carries the same Social timeline return.
    src = once(
        src,
        '.setPositiveButton("Masuk di aplikasi",(d,w)->open(BASE+"/akun.html"))',
        '.setPositiveButton("Masuk di aplikasi",(d,w)->open(BASE+"/akun.html?next=%2Fberanda-trader.html%23mm44-feed"))',
        "native beta login return",
    )
    src = once(
        src,
        '@Override public void onSignedIn(String username){dropRetained();if(!destroyed&&tab==SOCIAL&&web!=null)web.reload();}',
        '@Override public void onSignedIn(String username){dropRetained();if(!destroyed&&tab==SOCIAL&&web!=null)open(BASE+paths[SOCIAL]);}',
        "native Google Social return",
    )

    # Select the existing website TV page with resilient selectors. The live
    # site can render the nav lazily and does not guarantee a data-page attr.
    old_adapt = '''        String socialStyle="var ss=document.getElementById('mm43-social-style');if(!ss){ss=document.createElement('style');ss.id='mm43-social-style';document.head.appendChild(ss)}if(ss.dataset.revision!=='438'){ss.textContent="+socialCssQuoted+";ss.dataset.revision='438';}";
        String install="(function(){if(!("+ready+"))return 'retry';"+common+"\\n"+homeCards+"\\n"+brandingScript+"\\n"+
            depthScript+"\\nif(window.MMDepth423)window.MMDepth423.install("+depthCssQuoted+");\\n"+
            chromeScript+"\\nif(window.MMChrome424)window.MMChrome424.install();\\n"+
            lightScript+"\\nif(window.MMLight425)window.MMLight425.install();var l=document.getElementById('mm425-light');if(!l){l=document.createElement('style');l.id='mm425-light';document.head.appendChild(l)}if(l.dataset.revision!=='438'){l.textContent="+lightCssQuoted+";l.dataset.revision='438';}document.head.appendChild(l);return window.__mm411BundledReady?'bundled':'fallback';})()";'''
    new_adapt = '''        String socialStyle="var ss=document.getElementById('mm43-social-style');if(!ss){ss=document.createElement('style');ss.id='mm43-social-style';document.head.appendChild(ss)}if(ss.dataset.revision!=='438'){ss.textContent="+socialCssQuoted+";ss.dataset.revision='438';}";
        String tvRoute="";
        if(tab==XAUWAR&&("/".equals(path)||"/index.html".equals(path))){
            tvRoute="(function(){window.__mmAppTvRoute=window.__mmAppTvRoute||{seq:0,lastClick:0};"
                +"var state=window.__mmAppTvRoute,token=++state.seq,tries=0,timer=0,observer=null;"
                +"function norm(v){return String(v||'').replace(/\\s+/g,' ').trim().toLowerCase();}"
                +"function stop(mark){if(timer)clearTimeout(timer);if(observer)observer.disconnect();"
                +"document.documentElement.dataset.mmAppTv=mark;try{window.dispatchEvent(new CustomEvent('mmapp:tv-'+mark));}catch(e){}}"
                +"function button(){var nav=document.getElementById('nav')||document.querySelector('nav');"
                +"var scope=nav||document;var direct=scope.querySelector('button[data-page=\\\"MarketMarney TV\\\"],button[name=\\\"MARKETMARNEY TV\\\"],[aria-label=\\\"MARKETMARNEY TV\\\"],[aria-label=\\\"MarketMarney TV\\\"]');"
                +"if(direct)return direct;var all=scope.querySelectorAll('button,a,[role=\\\"button\\\"]');"
                +"for(var i=0;i<all.length;i++){var e=all[i],label=norm(e.getAttribute('data-page')||e.getAttribute('name')||e.getAttribute('aria-label')||e.textContent);if(label==='marketmarney tv')return e;}return null;}"
                +"function route(){if(!window.__mmAppTvRoute||window.__mmAppTvRoute.seq!==token||location.hash!=='#mm-app-tv')return stop('cancelled');"
                +"var app=document.getElementById('app')||document.querySelector('main'),b=button();"
                +"if(!app||!b){if(++tries<140){timer=setTimeout(route,250);return;}return stop('error');}"
                +"var text=norm(app.innerText),active=b.classList.contains('active')||b.getAttribute('aria-current')==='page'||b.getAttribute('aria-selected')==='true'||b.getAttribute('aria-pressed')==='true';"
                +"var marker=app.querySelector('.mm-tv-filters,.mm-tv-grid,.mm-tv-card,[data-mm-tv],[class*=\\\"mm-tv\\\"],iframe[src*=\\\"youtube\\\"],video');"
                +"if(text.indexOf('marketmarney tv')>=0&&(active||marker))return stop('ready');"
                +"var now=Date.now();if(now-state.lastClick>1400){state.lastClick=now;try{b.scrollIntoView({block:'nearest',inline:'nearest'});}catch(e){}try{b.click();}catch(e){}}"
                +"if(++tries<140){timer=setTimeout(route,250);return;}stop('error');}"
                +"observer=new MutationObserver(function(){if(window.__mmAppTvRoute&&window.__mmAppTvRoute.seq===token){if(timer)clearTimeout(timer);timer=setTimeout(route,40);}});"
                +"observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','aria-current','aria-selected','aria-pressed']});route();})();";
            Log.i("MMAPP_TV","resilient route injected tab=2 catalogue=MarketMarney TV");
        }
        String install="(function(){if(!("+ready+"))return 'retry';"+common+"\\n"+homeCards+"\\n"+brandingScript+"\\n"+
            depthScript+"\\nif(window.MMDepth423)window.MMDepth423.install("+depthCssQuoted+");\\n"+
            chromeScript+"\\nif(window.MMChrome424)window.MMChrome424.install();\\n"+
            lightScript+"\\nif(window.MMLight425)window.MMLight425.install();var l=document.getElementById('mm425-light');if(!l){l=document.createElement('style');l.id='mm425-light';document.head.appendChild(l)}if(l.dataset.revision!=='438'){l.textContent="+lightCssQuoted+";l.dataset.revision='438';}document.head.appendChild(l);"+tvRoute+"return window.__mm411BundledReady?'bundled':'fallback';})()";'''
    src = once(src, old_adapt, new_adapt, "resilient native 4.38 TV adaptation")

    path.write_text(src, encoding="utf-8")
    print("Marney 4.38 UI retained; Social login returns to timeline; TV route hardened")


if __name__ == "__main__":
    import sys
    apply(Path(sys.argv[1] if len(sys.argv) > 1 else "android438"))
