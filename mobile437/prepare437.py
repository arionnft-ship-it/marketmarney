#!/usr/bin/env python3
"""Apply MarketMarney 4.37 startup, session and bounded Reel recovery optimizations to 4.36."""
from pathlib import Path
import hashlib
import json
import shutil

from optimize_reels437 import patch_controller

base=Path(__file__).resolve().parent
root=Path('android437')
if not root.exists():
    raise SystemExit('android437 source is missing')

def digest(path:Path)->str:
    return hashlib.sha256(path.read_bytes()).hexdigest()
def inventory():
    return {p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}
def read(rel:str)->str:
    return (root/rel).read_text(encoding='utf-8')
def write(rel:str,text:str)->None:
    path=root/rel;path.parent.mkdir(parents=True,exist_ok=True);path.write_text(text,encoding='utf-8')
def replace(rel:str,old:str,new:str,count:int=1)->None:
    text=read(rel);actual=text.count(old)
    assert actual==count,f'{rel}: expected {count}, found {actual}: {old[:180]!r}'
    write(rel,text.replace(old,new,count))

before=inventory()

replace('app/build.gradle',"applicationId 'com.marketmarney.mobile.beta436'","applicationId 'com.marketmarney.mobile.beta437'")
replace('app/build.gradle','versionCode 40','versionCode 41')
replace('app/build.gradle',"versionName '4.36.0-beta'","versionName '4.37.0-beta'")
replace('app/src/main/res/values/strings.xml','MarketMarney 4.36 Stable','MarketMarney 4.37 Smooth')

main='app/src/main/java/com/marketmarney/mobile/MainActivity.java'
replace(main,'MarketMarney 4.36.0-beta','MarketMarney 4.37.0-beta')
replace(main,'MarketMarneyAndroid/4.36 AppShell','MarketMarneyAndroid/4.37 AppShell')
replace(main,"version:'4.36'","version:'4.37'")
replace(main,"dataset.mmAndroid='436'","dataset.mmAndroid='437'")
replace(main,"dataset.revision!=='436'","dataset.revision!=='437'",count=2)
replace(main,"dataset.revision='436'","dataset.revision='437'",count=2)

old_assets='depthCss=asset("depth423.css");depthScript=asset("depth423.js");chromeScript=asset("chrome424.js");lightCss=asset("light425.css")+"\\n"+asset("soft426.css")+"\\n"+asset("fast428.css")+"\\n"+asset("social429.css")+"\\n"+asset("home430.css")+"\\n"+asset("reels433.css")+"\\n"+asset("performance435.css")+"\\n"+asset("performance436.css");lightScript=asset("light425.js")+"\\n"+asset("social429.js")+"\\n"+asset("home430.js")+"\\n"+asset("reels433.js")+"\\n"+asset("lifecycle435.js")+"\\n"+asset("runtime436.js");'
new_assets='depthCss=asset("depth423.css");depthScript=asset("depth423.js");chromeScript=asset("chrome424.js");lightCss=asset("light425.css")+"\\n"+asset("soft426.css")+"\\n"+asset("fast428.css")+"\\n"+asset("social429.css")+"\\n"+asset("home430.css")+"\\n"+asset("reels433.css")+"\\n"+asset("performance435.css")+"\\n"+asset("performance436.css")+"\\n"+asset("smooth437.css");lightScript=asset("light425.js")+"\\n"+asset("social429.js")+"\\n"+asset("home430.js")+"\\n"+asset("reels433.js")+"\\n"+asset("lifecycle435.js")+"\\n"+asset("runtime436.js");'
replace(main,old_assets,new_assets)

old_social_fields='''    private String socialScript="", socialCss="", brandingScript="", depthCss="", depthScript="", chromeScript="", lightCss="", lightScript="";
    private String socialCssQuoted="",depthCssQuoted="",lightCssQuoted="",lastAdaptedDocument="";
'''
new_social_fields='''    private String socialScript="", socialCss="", brandingScript="", depthCss="", depthScript="", chromeScript="", lightCss="", lightScript="";
    private String socialCssQuoted="",depthCssQuoted="",lightCssQuoted="",lastAdaptedDocument="";
    private final Object socialAssetLock=new Object();
    private volatile boolean socialAssetsReady=false;
    private java.util.concurrent.ExecutorService socialAssetExecutor;
    private java.util.concurrent.Future<?> socialAssetFuture;
'''
replace(main,old_social_fields,new_social_fields)

replace(main,'    private long lastAutoRecoverAt=-10000L;','''    private long lastAutoRecoverAt=-10000L;
    private Runnable runtimeDispatchTask;
    private String lastRuntimeSignature="";''')

social_methods='''    private void ensureSocialAssets(){
        if(socialAssetsReady)return;
        synchronized(socialAssetLock){
            if(socialAssetsReady)return;
            socialCss=asset("social44.css")+"\\n"+asset("reels46.css")+"\\n"+asset("navigation47.css")+"\\n"+asset("premium411.css");
            socialScript=asset("profile49.js")+"\\n"+asset("social44.js")+"\\n"+asset("reels46.js")+"\\n"+asset("navigation47.js");
            socialCssQuoted=JSONObject.quote(socialCss);socialAssetsReady=true;
        }
    }
    private void preloadSocialAssets(){
        if(destroyed||socialAssetsReady||lowRamDevice||nativePowerSave)return;
        synchronized(socialAssetLock){
            if(destroyed||socialAssetsReady||socialAssetFuture!=null)return;
            if(socialAssetExecutor==null)socialAssetExecutor=java.util.concurrent.Executors.newSingleThreadExecutor();
            try{
                socialAssetFuture=socialAssetExecutor.submit(()->{
                    try{ensureSocialAssets();}
                    catch(RuntimeException failure){Log.w("MM437_ASSETS","Social assets will retry on demand",failure);}
                    finally{synchronized(socialAssetLock){socialAssetFuture=null;}}
                });
            }catch(java.util.concurrent.RejectedExecutionException ignored){}
        }
    }
    private void flushWebSession(){
        try{CookieManager.getInstance().flush();}catch(RuntimeException ignored){}
    }
'''
replace(main,'    private void clearOffline(){if(offline!=null){frame.removeView(offline);offline=null;}}',social_methods+'    private void clearOffline(){if(offline!=null){frame.removeView(offline);offline=null;}}')

replace(main,
'''        firstPaint=true;cancelPageWait();clearOffline();progress.setVisibility(View.GONE);
''',
'''        firstPaint=true;cancelPageWait();clearOffline();progress.setVisibility(View.GONE);
        if(!socialAssetsReady)frame.postDelayed(this::preloadSocialAssets,650);
''')

replace(main,
'''        socialCss=asset("social44.css")+"\\n"+asset("reels46.css")+"\\n"+asset("navigation47.css")+"\\n"+asset("premium411.css");socialScript=asset("profile49.js")+"\\n"+asset("social44.js")+"\\n"+asset("reels46.js")+"\\n"+asset("navigation47.js");
''',
'''        // Heavy Social assets are loaded after first paint or on first Social entry.
''')
replace(main,
'        socialCssQuoted=JSONObject.quote(socialCss);depthCssQuoted=JSONObject.quote(depthCss);lightCssQuoted=JSONObject.quote(lightCss);',
'        depthCssQuoted=JSONObject.quote(depthCss);lightCssQuoted=JSONObject.quote(lightCss);')

replace(main,
'        boolean social="/beranda-trader.html".equals(path)||"/profil.html".equals(path)||"/grup-trader.html".equals(path);',
'        boolean social="/beranda-trader.html".equals(path)||"/profil.html".equals(path)||"/grup-trader.html".equals(path);\n        if(social)ensureSocialAssets();')

old_dispatch='''    private void dispatchRuntimeState(){
        WebView target=web;if(destroyed||target==null||!own(target.getUrl()))return;
        String detail=runtimeDetail();
        target.evaluateJavascript("try{var d="+detail+";window.__mm436NativeNetwork=true;window.dispatchEvent(new CustomEvent('mmapp:runtime',{detail:d}));window.dispatchEvent(new CustomEvent('mmapp:network',{detail:d}));window.dispatchEvent(new CustomEvent('mmapp:power',{detail:{saving:d.powerSave}}))}catch(e){}",null);
    }
'''
new_dispatch='''    private void dispatchRuntimeState(){
        final WebView target=web;if(destroyed||target==null||!own(target.getUrl()))return;
        final String detail=runtimeDetail(),document=target.getUrl();
        final String signature=System.identityHashCode(target)+"|"+document+"|"+detail;
        if(signature.equals(lastRuntimeSignature))return;
        if(runtimeDispatchTask!=null)frame.removeCallbacks(runtimeDispatchTask);
        runtimeDispatchTask=()->{
            runtimeDispatchTask=null;
            if(destroyed||target!=web||!Recovery414.sameDocument(document,target.getUrl()))return;
            lastRuntimeSignature=signature;
            target.evaluateJavascript("try{var d="+detail+";window.__mm436NativeNetwork=true;window.dispatchEvent(new CustomEvent('mmapp:runtime',{detail:d}));window.dispatchEvent(new CustomEvent('mmapp:network',{detail:d}));window.dispatchEvent(new CustomEvent('mmapp:power',{detail:{saving:d.powerSave}}))}catch(e){}",null);
        };
        frame.postDelayed(runtimeDispatchTask,90);
    }
'''
replace(main,old_dispatch,new_dispatch)

replace(main,
'if(v!=web)return;lastAdaptedDocument="";if(pendingIndexTab!=-1)',
'if(v!=web)return;lastAdaptedDocument="";lastRuntimeSignature="";if(pendingIndexTab!=-1)')

old_pause='''        if(web!=null){if(own(web.getUrl()))web.evaluateJavascript("try{window.__mm45Suspended=true;window.dispatchEvent(new Event('mm45:suspend'));document.querySelectorAll('video,audio').forEach(function(v){v.pause()})}catch(e){}",null);if(tab==XAUWAR)web.setVisibility(View.GONE);web.onPause();}
        super.onPause();
'''
new_pause='''        if(web!=null){if(own(web.getUrl()))web.evaluateJavascript("try{window.__mm45Suspended=true;window.dispatchEvent(new Event('mm45:suspend'));document.querySelectorAll('video,audio').forEach(function(v){v.pause()})}catch(e){}",null);if(tab==XAUWAR)web.setVisibility(View.GONE);web.onPause();}
        flushWebSession();super.onPause();
'''
replace(main,old_pause,new_pause)
replace(main,
'    @Override protected void onStop(){super.onStop();if(!isChangingConfigurations())dropRetained();}',
'    @Override protected void onStop(){flushWebSession();super.onStop();if(!isChangingConfigurations())dropRetained();}')

old_destroy='    @Override protected void onDestroy(){destroyed=true;unregisterRuntimeSignals();if(launchOverlay!=null)launchOverlay.dispose();closeFullVideo();dropRetained();disposeWeb();if(fileValidator!=null)fileValidator.shutdownNow();if(google!=null)google.close();super.onDestroy();}'
new_destroy='    @Override protected void onDestroy(){destroyed=true;if(runtimeDispatchTask!=null)frame.removeCallbacks(runtimeDispatchTask);flushWebSession();unregisterRuntimeSignals();if(socialAssetFuture!=null)socialAssetFuture.cancel(true);if(socialAssetExecutor!=null)socialAssetExecutor.shutdownNow();if(launchOverlay!=null)launchOverlay.dispose();closeFullVideo();dropRetained();disposeWeb();if(fileValidator!=null)fileValidator.shutdownNow();if(google!=null)google.close();super.onDestroy();}'
replace(main,old_destroy,new_destroy)

startup='app/src/main/java/com/marketmarney/mobile/StartupOverlay.java'
replace(startup,'MarketMarney 4.36 opening','MarketMarney 4.37 opening')
replace(startup,'MM436_LAUNCH','MM437_LAUNCH',count=2)

version_tests=[]
for test_file in (root/'app/src/androidTest/java').rglob('*.java'):
    text=test_file.read_text(encoding='utf-8')
    updated=text.replace('4.36.0-beta','4.37.0-beta').replace('com.marketmarney.mobile.beta436','com.marketmarney.mobile.beta437')
    if updated!=text:
        test_file.write_text(updated,encoding='utf-8')
        version_tests.append(test_file.relative_to(root).as_posix())

assets=root/'app/src/main/assets'
for rel in ['reels46.js','social411/app.js','social411/bundle427.js']:
    patch_controller(assets/rel)
shutil.copy2(base/'smooth437.css',assets/'smooth437.css')
new_test=root/'app/src/androidTest/java/com/marketmarney/mobile/Performance437Test.java'
new_test.parent.mkdir(parents=True,exist_ok=True)
shutil.copy2(base/'Performance437Test.java',new_test)
shutil.copy2(base/'Marney437-Panduan.md',root/'README-MULAI-DISINI.md')

after=inventory()
changed=sorted(set(before)^set(after)|{p for p in set(before)&set(after) if before[p]!=after[p]})
expected={
    'README-MULAI-DISINI.md','app/build.gradle',
    'app/src/main/java/com/marketmarney/mobile/MainActivity.java',
    'app/src/main/java/com/marketmarney/mobile/StartupOverlay.java',
    'app/src/main/res/values/strings.xml',
    'app/src/main/assets/reels46.js','app/src/main/assets/social411/app.js','app/src/main/assets/social411/bundle427.js',
    'app/src/main/assets/smooth437.css',
    'app/src/androidTest/java/com/marketmarney/mobile/Performance437Test.java',
}
expected.update(version_tests)
assert changed==sorted(expected),{'unexpected':sorted(set(changed)-expected),'missing':sorted(expected-set(changed))}
manifest={
    'release':'4.37.0-beta','package':'com.marketmarney.mobile.beta437','baseRelease':'4.36.0-beta',
    'purpose':'Move heavy Social assets out of cold startup, persist WebView cookies on lifecycle transitions, coalesce native runtime events, and recover a genuinely stalled active Reel at most twice without reloading Social.',
    'changed':[{'path':rel,'beforeSha256':before.get(rel),'afterSha256':after.get(rel)} for rel in changed],
    'preserved':{rel:sha for rel,sha in sorted(before.items()) if rel not in changed},
}
Path('verified437.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(f"Verified 4.37 smooth patch: {len(changed)} changed files; {len(manifest['preserved'])} unchanged files.")
