#!/usr/bin/env python3
"""Improve XAUWar WebView first-content readiness only in the Play candidate.

Keep the separately verified 4.39 beta unchanged. Anchor checks fail closed
if the reconstructed native source changes unexpectedly.
"""
from pathlib import Path

def exactly(src, old, replacement, label):
    n=src.count(old)
    if n != 1:
        raise RuntimeError(f'{label}: expected 1 source match, got {n}')
    return src.replace(old,replacement,1)

def apply(root:Path) -> None:
    activity=root/'app/src/main/java/com/marketmarney/mobile/MainActivity.java'
    s=activity.read_text(encoding='utf-8')
    s=exactly(s,'private View offline, fullVideo;',
        'private View offline, fullVideo, xauLoading;', 'loading view field')
    s=exactly(s,'    private Runnable slowTask;',
        '    private Runnable slowTask;\n    private long xauContentToken=0;\n    private int xauContentPolls=0;\n    private boolean xauContentProbeStarted=false;',
        'XAU content probe fields')

    mark='    private void beginPageWait(WebView target){\n        cancelPageWait();firstPaint=false;mainFailed=false;failureCode="";failureNote="";'
    updated='    private void beginPageWait(WebView target){\n        cancelPageWait();firstPaint=false;mainFailed=false;failureCode="";failureNote="";\n        xauContentToken++;xauContentPolls=0;xauContentProbeStarted=false;
        Log.i("MMPLAY_UI","begin tab="+tab+" token="+xauContentToken);\n        if(tab==XAUWAR||tab==HOME||tab==MARKET)showXauLoading();else clearXauLoading();'
    s=exactly(s,mark,updated,'page wait initialization')
    s=exactly(s,'        cancelPageWait();navigationStarted=SystemClock.uptimeMillis();',
        '        cancelPageWait();clearXauLoading();navigationStarted=SystemClock.uptimeMillis();',
        'navigation cleanup')
    s=exactly(s,
        '        endLaunchAnimation(false,"connection-error");cancelPageWait();',
        '        endLaunchAnimation(false,"connection-error");cancelPageWait();clearXauLoading();',
        'error cleanup')

    old='''    private void pageReady(WebView target,String url){
        if(target!=web||!own(url)||mainFailed)return;
        firstPaint=true;cancelPageWait();clearOffline();progress.setVisibility(View.GONE);
        if(tab!=SOCIAL&&!socialAssetsReady)frame.postDelayed(this::preloadSocialAssets,650);
    }'''
    new='''    private void clearXauLoading(){
        if(xauLoading!=null){Log.i("MMPLAY_UI","clear tab="+tab+" token="+xauContentToken);frame.removeView(xauLoading);xauLoading=null;}
    }
    private void showXauLoading(){
        if(destroyed||frame==null||(tab!=XAUWAR&&tab!=HOME&&tab!=MARKET))return;
        Log.i("MMPLAY_UI","show tab="+tab+" token="+xauContentToken+" firstPaint="+firstPaint);
        clearXauLoading();
        LinearLayout box=column();box.setGravity(Gravity.CENTER);
        box.setPadding(dp(28),dp(24),dp(28),dp(24));
        box.setBackground(DepthStyle423.screen(this,true));box.setElevation(dp(8));
        ImageView brand=new ImageView(this);brand.setImageResource(R.drawable.mm_brand_logo);
        brand.setScaleType(ImageView.ScaleType.FIT_CENTER);
        brand.setContentDescription("MarketMarney");
        box.addView(brand,new LinearLayout.LayoutParams(dp(72),dp(72)));
        TextView title=text(tab==XAUWAR?"Menyiapkan XAUWar":tab==MARKET?"Memuat Market Live":"Memuat Beranda",19,TEXT);
        title.setTypeface(Typeface.DEFAULT,Typeface.BOLD);title.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams titlePos=new LinearLayout.LayoutParams(-1,-2);
        titlePos.topMargin=dp(14);box.addView(title,titlePos);
        TextView description=text(tab==XAUWAR?"Menghubungkan arena dan data pasar. Anda tetap bisa berpindah menu.":"Menyiapkan informasi pasar. Gunakan menu lain bila perlu.",13,MUTED);
        description.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams notePos=new LinearLayout.LayoutParams(-1,-2);
        notePos.topMargin=dp(9);notePos.bottomMargin=dp(20);
        box.addView(description,notePos);
        ProgressBar wheel=new ProgressBar(this);wheel.setIndeterminate(true);
        LinearLayout.LayoutParams wheelPos=new LinearLayout.LayoutParams(dp(30),dp(30));
        wheelPos.gravity=Gravity.CENTER_HORIZONTAL;box.addView(wheel,wheelPos);
        Button home=new Button(this);home.setText(tab==HOME?"Coba Lagi":"Kembali ke Beranda");home.setAllCaps(false);
        DepthStyle423.applyButton(home,true,false);
        home.setOnClickListener(v->{if(tab==HOME){if(web!=null)web.reload();}else navigate(HOME);});
        LinearLayout.LayoutParams homePos=new LinearLayout.LayoutParams(-1,dp(46));
        homePos.topMargin=dp(24);box.addView(home,homePos);
        xauLoading=box;
        frame.addView(xauLoading,new FrameLayout.LayoutParams(-1,-1));xauLoading.bringToFront();
    }
    private void completePageReady(WebView target,String url){
        if(target!=web||!own(url)||mainFailed||destroyed)return;
        firstPaint=true;cancelPageWait();clearXauLoading();clearOffline();
        Log.i("MMPLAY_PAGE","ready tab="+tab+" path="+Uri.parse(url).getPath());
        progress.setVisibility(View.GONE);
        if(tab!=SOCIAL&&!socialAssetsReady)frame.postDelayed(this::preloadSocialAssets,650);
    }
    private void probeXauVisible(WebView target,String url,long token){
        if(destroyed||target!=web||(tab!=XAUWAR&&tab!=HOME&&tab!=MARKET)||firstPaint||mainFailed||token!=xauContentToken
            ||!Recovery414.sameDocument(url,lastUrl))return;
        // Require meaningful, visible page content, not merely page-commit, spinner,
        // or hidden text. Do not gate on document.readyState: externally hosted
        // embeds may stay loading after the primary UI is already readable.
        String js;
        if(tab==XAUWAR){
            js="(function(){var b=document.body;if(!b)return false;"
                +"var h=document.querySelector('h1');var r=h&&h.getBoundingClientRect();"
                +"var t=(b.innerText||'').replace(/\\s+/g,' ').trim();"
                +"return t.length>40&&b.scrollHeight>160&&r&&r.width>70&&r.height>10"
                +"&&r.top<innerHeight&&r.bottom>0&&/warxau|market assault|base buy|arena/i.test(t);})()";
        }else{
            js="(function(){var app=document.querySelector('#app');"
                +"if(!app)return false;"
                +"var r=app.getBoundingClientRect();var t=(app.innerText||'').replace(/\\s+/g,' ').trim();"
                +"var style=getComputedStyle(app);"
                +"return t.length>95&&r.height>180&&r.width>200&&r.top<innerHeight"
                +"&&r.bottom>0&&style.display!=='none'&&style.visibility!=='hidden'"
                +"&&/marketmarney|berita|analisis|tradingview|pasar/i.test(t);})()";
        }
        target.evaluateJavascript(js,result->{
            if(destroyed||target!=web||(tab!=XAUWAR&&tab!=HOME&&tab!=MARKET)||firstPaint||mainFailed
                ||token!=xauContentToken||!Recovery414.sameDocument(url,lastUrl))return;
            if("true".equals(result)){completePageReady(target,url);return;}
            if(++xauContentPolls>=68){
                showFailure("EMPTY","Konten "+labels[tab]+" belum dapat ditampilkan. Periksa koneksi lalu coba lagi.");
                return;
            }
            frame.postDelayed(()->probeXauVisible(target,url,token),250);
        });
    }
    private void pageReady(WebView target,String url){
        if(target!=web||!own(url)||mainFailed)return;
        if((tab==XAUWAR&&XAUWAR_PAGE.equals(Uri.parse(url).getPath()))||((tab==HOME||tab==MARKET)&&("/index.html".equals(Uri.parse(url).getPath())||"/".equals(Uri.parse(url).getPath())))){
            if(!xauContentProbeStarted){
                xauContentProbeStarted=true;
                probeXauVisible(target,url,xauContentToken);
            }
            return;
        }
        completePageReady(target,url);
    }'''
    s=exactly(s,old,new,'page readiness')
    activity.write_text(s,encoding='utf-8')

if __name__=='__main__':
    import sys
    apply(Path(sys.argv[1] if len(sys.argv)>1 else 'android439'))
    print('Play candidate only: verified XAUWar visible-content loading and bounded recovery patch')
