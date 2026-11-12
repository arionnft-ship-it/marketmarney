#!/usr/bin/env python3
"""Switch the former XAUWar bottom tab to the live MarketMarney TV SPA.

This is scoped to the isolated Android candidate branch, after 4.39 Play
preparation. It does not change the website, backend, or beta APK.
"""
from pathlib import Path

def once(src, old, new, name):
    number=src.count(old)
    if number!=1:
        raise RuntimeError(f'{name}: source drift; expected 1 anchor, got {number}')
    return src.replace(old,new,1)

def apply(root:Path):
    path=root/'app/src/main/java/com/marketmarney/mobile/MainActivity.java'
    src=path.read_text(encoding='utf-8')

    # Keep the internal tab index for binary/test compatibility; change the
    # presentation, real destination, and tab icon, not the other 4 tabs.
    src=once(src,
       'private final String[] labels={"Beranda","Berita","XAUWar","Market Live","Social Marney"};',
       'private final String[] labels={"Beranda","Berita","MarketMarney TV","Market Live","Social Marney"};',
       'bottom tab label')
    src=once(src,
       'private final String[] paths={"/index.html",NEWS_PATH,XAUWAR_PATH,"/index.html#marketlive","/beranda-trader.html#mm44-feed"};',
       'private final String[] paths={"/index.html",NEWS_PATH,"/index.html#mm-app-tv","/index.html#marketlive","/beranda-trader.html#mm44-feed"};',
       'bottom tab URL')
    old_label='TextView title=text(labels[i],10,selected?(lightSocial()?Color.rgb(125,87,25):GOLD):(lightSocial()?Color.rgb(85,104,127):MUTED));title.setSingleLine(true);title.setGravity(Gravity.CENTER);'
    new_label='TextView title=text(i==XAUWAR?"MarketMarney\\nTV":labels[i],10,selected?(lightSocial()?Color.rgb(125,87,25):GOLD):(lightSocial()?Color.rgb(85,104,127):MUTED));title.setSingleLine(i!=XAUWAR);if(i==XAUWAR){title.setMaxLines(2);title.setIncludeFontPadding(false);}title.setGravity(Gravity.CENTER);'
    src=once(src,old_label,new_label,'TV two-line label')
    src=once(src,'cell.addView(iconShell,new LinearLayout.LayoutParams(dp(53),dp(33)));',
        'cell.addView(iconShell,new LinearLayout.LayoutParams(dp(53),dp(i==XAUWAR?29:33)));',
        'TV icon footprint')

    old_icon='else if(kind==XAUWAR){q.moveTo(12,2);q.lineTo(21,6);q.lineTo(20,14);q.cubicTo(18,19,15,21,12,23);q.cubicTo(9,21,6,19,4,14);q.lineTo(3,6);q.close();c.drawPath(q,p);c.drawLine(8,8,16,16,p);c.drawLine(16,8,8,16,p);}'
    new_icon='else if(kind==XAUWAR){c.drawRoundRect(2,4,22,19,3,3,p);q.moveTo(10,8);q.lineTo(16,11.5f);q.lineTo(10,15);q.close();c.drawPath(q,p);c.drawLine(9,22,15,22,p);}'
    src=once(src,old_icon,new_icon,'TV play icon')

    # Old XAUWar links elsewhere on the website must NOT switch to the TV tab.
    old_deeplink='''                    if(XAUWAR_PAGE.equals(p)){
                        String latest=latestXauWarUrl(u);
                        if(tab!=XAUWAR){navigate(XAUWAR);if(!(BASE+XAUWAR_PATH).equals(latest))open(latest);return true;}
                        if(!latest.equals(u.toString())){open(latest);return true;}
                    }'''
    src=once(src,old_deeplink,
        '''                    // Legacy XAUWar links continue as ordinary trusted web
                    // links; they no longer claim the MarketMarney TV tab.
                    if(XAUWAR_PAGE.equals(p))return false;''',
        'prevent legacy XAU links hijacking TV')

    # Navigation remains same-origin, but the public site is an SPA and has
    # no dedicated /tv.html route. Its verified nav element is data-page.
    old_anchor='''    private void pageReady(WebView target,String url){
        if(target!=web||!own(url)||mainFailed)return;
        if((tab==XAUWAR&&XAUWAR_PAGE.equals(Uri.parse(url).getPath()))||((tab==HOME||tab==MARKET)&&("/index.html".equals(Uri.parse(url).getPath())||"/".equals(Uri.parse(url).getPath())))){'''
    new_anchor=r'''    private int tvRoutePolls=0;
    private void probeMarketmarneyTv(WebView target,String url,long token){
        if(destroyed||target!=web||tab!=XAUWAR||firstPaint||mainFailed||token!=xauContentToken
            ||!Recovery414.sameDocument(url,lastUrl))return;
        // Public-site contract verified: #nav button[data-page="MarketMarney TV"]
        // selects the actual TV catalogue, which renders .mm-tv-filters.
        String js="(function(){"
            +"var nav=document.getElementById('nav');"
            +"var b=nav&&nav.querySelector('button[data-page=\"MarketMarney TV\"]');"
            +"var app=document.getElementById('app');"
            +"if(!b||!app)return 'wait';"
            +"if(!b.classList.contains('active')){"
            +"if(window.__mmAppTvLastClick&&Date.now()-window.__mmAppTvLastClick<850)return 'wait';"
            +"window.__mmAppTvLastClick=Date.now();b.click();return 'clicked';}"
            +"var v=app.querySelector('.mm-tv-filters');var rect=app.getBoundingClientRect();"
            +"return v&&rect.width>180&&rect.height>100"
            +"&&(app.innerText||'').indexOf('MarketMarney TV')>=0?'ready':'wait';"
            +"})()";
        target.evaluateJavascript(js,value->{
            if(destroyed||target!=web||tab!=XAUWAR||firstPaint||mainFailed||token!=xauContentToken
                ||!Recovery414.sameDocument(url,lastUrl))return;
            if("\"ready\"".equals(value)){
                Log.i("MMAPP_TV","ready tab=2 catalogue=MarketMarney TV");
                completePageReady(target,url);return;
            }
            if(++tvRoutePolls>=72){
                showFailure("EMPTY","MarketMarney TV belum bisa dimuat. Periksa koneksi dan coba lagi.");
                return;
            }
            frame.postDelayed(()->probeMarketmarneyTv(target,url,token),250);
        });
    }
    private void pageReady(WebView target,String url){
        if(target!=web||!own(url)||mainFailed)return;
        if(tab==XAUWAR&&("/index.html".equals(Uri.parse(url).getPath())||"/".equals(Uri.parse(url).getPath()))){
            if(!xauContentProbeStarted){
                xauContentProbeStarted=true;tvRoutePolls=0;
                probeMarketmarneyTv(target,url,xauContentToken);
            }
            return;
        }
        if((tab==XAUWAR&&XAUWAR_PAGE.equals(Uri.parse(url).getPath()))||((tab==HOME||tab==MARKET)&&("/index.html".equals(Uri.parse(url).getPath())||"/".equals(Uri.parse(url).getPath())))){'''
    src=once(src,old_anchor,new_anchor,'TV ready detection')

    src=once(src,
        'if("marketlive".equals(h)&&tab!=MARKET){navigate(MARKET);return true;}',
        'if("marketlive".equals(h)&&tab!=MARKET){navigate(MARKET);return true;}\n                        if("mm-app-tv".equals(h)&&tab!=XAUWAR){navigate(XAUWAR);return true;}',
        'TV app hash interception')

    src=once(src,'tab==XAUWAR?"Menyiapkan XAUWar":tab==MARKET?',
        'tab==XAUWAR?"MarketMarney TV":tab==MARKET?',
        'native loading label')
    src=once(src,
        'tab==XAUWAR?"Menghubungkan arena dan data pasar. Anda tetap bisa berpindah menu.":"Menyiapkan informasi pasar. Gunakan menu lain bila perlu."',
        'tab==XAUWAR?"Menyiapkan daftar video. Anda tetap bisa berpindah menu.":"Menyiapkan informasi pasar. Gunakan menu lain bila perlu."',
        'native loading subtitle')

    path.write_text(src,encoding='utf-8')
    print('TV tab installed without changing the website; old XAUWar tab no longer routes to war')

if __name__=='__main__':
    import sys
    apply(Path(sys.argv[1] if len(sys.argv)>1 else 'android439'))
