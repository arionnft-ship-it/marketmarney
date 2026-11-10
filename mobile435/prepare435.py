#!/usr/bin/env python3
"""Apply MarketMarney 4.35 lifecycle, memory and playback optimizations to 4.34."""
from pathlib import Path
import hashlib
import json
import shutil

from optimize_reels435 import patch_controller

base=Path(__file__).resolve().parent
root=Path('android435')
if not root.exists():
    raise SystemExit('android435 source is missing')

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
    assert actual==count,f'{rel}: expected {count}, found {actual}: {old[:160]!r}'
    write(rel,text.replace(old,new,count))

before=inventory()

replace('app/build.gradle',"applicationId 'com.marketmarney.mobile.beta434'","applicationId 'com.marketmarney.mobile.beta435'")
replace('app/build.gradle','versionCode 38','versionCode 39')
replace('app/build.gradle',"versionName '4.34.0-beta'","versionName '4.35.0-beta'")
replace('app/src/main/res/values/strings.xml','MarketMarney 4.34 Performance','MarketMarney 4.35 Optimal')

main='app/src/main/java/com/marketmarney/mobile/MainActivity.java'
replace(main,'MarketMarney 4.34.0-beta','MarketMarney 4.35.0-beta')
replace(main,'MarketMarneyAndroid/4.34 AppShell','MarketMarneyAndroid/4.35 AppShell')
replace(main,"version:'4.34'","version:'4.35'")
replace(main,"dataset.mmAndroid='434'","dataset.mmAndroid='435'")
replace(main,"dataset.revision!=='434'","dataset.revision!=='435'",count=2)
replace(main,"dataset.revision='434'","dataset.revision='435'",count=2)

old_assets='depthCss=asset("depth423.css");depthScript=asset("depth423.js");chromeScript=asset("chrome424.js");lightCss=asset("light425.css")+"\\n"+asset("soft426.css")+"\\n"+asset("fast428.css")+"\\n"+asset("social429.css")+"\\n"+asset("home430.css")+"\\n"+asset("reels433.css");lightScript=asset("light425.js")+"\\n"+asset("social429.js")+"\\n"+asset("home430.js")+"\\n"+asset("reels433.js");'
new_assets='depthCss=asset("depth423.css");depthScript=asset("depth423.js");chromeScript=asset("chrome424.js");lightCss=asset("light425.css")+"\\n"+asset("soft426.css")+"\\n"+asset("fast428.css")+"\\n"+asset("social429.css")+"\\n"+asset("home430.css")+"\\n"+asset("reels433.css")+"\\n"+asset("performance435.css");lightScript=asset("light425.js")+"\\n"+asset("social429.js")+"\\n"+asset("home430.js")+"\\n"+asset("reels433.js")+"\\n"+asset("lifecycle435.js");'
replace(main,old_assets,new_assets)

old_settings='WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setLoadsImagesAutomatically(true);s.setCacheMode(WebSettings.LOAD_DEFAULT);s.setDatabaseEnabled(true);web.setOverScrollMode(View.OVER_SCROLL_NEVER);web.setVerticalScrollBarEnabled(false);web.setHorizontalScrollBarEnabled(false);'
new_settings=old_settings+'if(Build.VERSION.SDK_INT>=26)web.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT,true);'
replace(main,old_settings,new_settings)

old_pause='''    @Override protected void onPause(){
        cancelPageWait();if(launchOverlay!=null)launchOverlay.dispose();
        if(web!=null){if(own(web.getUrl()))web.evaluateJavascript("try{window.__mm45Suspended=true;window.dispatchEvent(new Event('mm45:suspend'));document.querySelectorAll('video,audio').forEach(function(v){v.pause()})}catch(e){}",null);if(tab==XAUWAR)web.setVisibility(View.GONE);web.onPause();}
        super.onPause();
    }
'''
new_pause='''    private void notifyMemoryPressure(int level){
        WebView target=web;if(destroyed||target==null||!own(target.getUrl()))return;
        target.evaluateJavascript("try{window.dispatchEvent(new CustomEvent('mmapp:memory',{detail:{level:"+level+"}}))}catch(e){}",null);
    }
    private void notifyAppVisibility(boolean foreground){
        WebView target=web;if(destroyed||target==null||!own(target.getUrl()))return;
        String event=foreground?"mmapp:foreground":"mmapp:background";
        target.evaluateJavascript("try{window.dispatchEvent(new Event("+JSONObject.quote(event)+"))}catch(e){}",null);
    }
    @Override protected void onPause(){
        cancelPageWait();if(launchOverlay!=null)launchOverlay.dispose();notifyAppVisibility(false);
        if(web!=null){if(own(web.getUrl()))web.evaluateJavascript("try{window.__mm45Suspended=true;window.dispatchEvent(new Event('mm45:suspend'));document.querySelectorAll('video,audio').forEach(function(v){v.pause()})}catch(e){}",null);if(tab==XAUWAR)web.setVisibility(View.GONE);web.onPause();}
        super.onPause();
    }
'''
replace(main,old_pause,new_pause)

old_tail='''    @Override protected void onResume(){super.onResume();if(web!=null)resumePage(web);}
    @Override public void onTrimMemory(int level){super.onTrimMemory(level);if(level>=android.content.ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW)dropRetained();}
    @Override protected void onDestroy(){destroyed=true;if(launchOverlay!=null)launchOverlay.dispose();closeFullVideo();dropRetained();disposeWeb();if(fileValidator!=null)fileValidator.shutdownNow();if(google!=null)google.close();super.onDestroy();}
'''
new_tail='''    @Override protected void onResume(){super.onResume();if(web!=null){resumePage(web);notifyAppVisibility(true);}}
    @Override protected void onStop(){super.onStop();if(!isChangingConfigurations())dropRetained();}
    @Override public void onTrimMemory(int level){
        super.onTrimMemory(level);notifyMemoryPressure(level);
        if(level>=android.content.ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW)dropRetained();
        if(level>=android.content.ComponentCallbacks2.TRIM_MEMORY_BACKGROUND&&web!=null&&own(web.getUrl()))
            web.evaluateJavascript("try{document.querySelectorAll('video,audio').forEach(function(m){m.pause()})}catch(e){}",null);
    }
    @Override public void onLowMemory(){super.onLowMemory();notifyMemoryPressure(android.content.ComponentCallbacks2.TRIM_MEMORY_COMPLETE);dropRetained();}
    @Override protected void onDestroy(){destroyed=true;if(launchOverlay!=null)launchOverlay.dispose();closeFullVideo();dropRetained();disposeWeb();if(fileValidator!=null)fileValidator.shutdownNow();if(google!=null)google.close();super.onDestroy();}
'''
replace(main,old_tail,new_tail)

startup='app/src/main/java/com/marketmarney/mobile/StartupOverlay.java'
replace(startup,'MarketMarney 4.34 opening','MarketMarney 4.35 opening')
replace(startup,'MM434_LAUNCH','MM435_LAUNCH',count=2)

version_tests=[]
for test_file in (root/'app/src/androidTest/java').rglob('*.java'):
    text=test_file.read_text(encoding='utf-8')
    updated=text.replace('4.34.0-beta','4.35.0-beta')
    if updated!=text:
        test_file.write_text(updated,encoding='utf-8')
        version_tests.append(test_file.relative_to(root).as_posix())

assets=root/'app/src/main/assets'
for rel in ['reels46.js','social411/app.js','social411/bundle427.js']:
    patch_controller(assets/rel)
shutil.copy2(base/'lifecycle435.js',assets/'lifecycle435.js')
shutil.copy2(base/'performance435.css',assets/'performance435.css')
new_test=root/'app/src/androidTest/java/com/marketmarney/mobile/Performance435Test.java'
new_test.parent.mkdir(parents=True,exist_ok=True)
shutil.copy2(base/'Performance435Test.java',new_test)
shutil.copy2(base/'Marney435-Panduan.md',root/'README-MULAI-DISINI.md')

after=inventory()
changed=sorted(set(before)^set(after)|{p for p in set(before)&set(after) if before[p]!=after[p]})
expected={
    'README-MULAI-DISINI.md','app/build.gradle',
    'app/src/main/java/com/marketmarney/mobile/MainActivity.java',
    'app/src/main/java/com/marketmarney/mobile/StartupOverlay.java',
    'app/src/main/res/values/strings.xml',
    'app/src/main/assets/reels46.js','app/src/main/assets/social411/app.js','app/src/main/assets/social411/bundle427.js',
    'app/src/main/assets/lifecycle435.js','app/src/main/assets/performance435.css',
    'app/src/androidTest/java/com/marketmarney/mobile/Performance435Test.java',
}
expected.update(version_tests)
assert changed==sorted(expected),{'unexpected':sorted(set(changed)-expected),'missing':sorted(expected-set(changed))}
manifest={
    'release':'4.35.0-beta','package':'com.marketmarney.mobile.beta435','baseRelease':'4.34.0-beta',
    'purpose':'Coordinate Android lifecycle, memory pressure, network changes, lazy feed media and duplicate-safe Reels playback while preserving the public website, database, branding and current navigation.',
    'changed':[{'path':rel,'beforeSha256':before.get(rel),'afterSha256':after.get(rel)} for rel in changed],
    'preserved':{rel:sha for rel,sha in sorted(before.items()) if rel not in changed},
}
Path('verified435.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(f"Verified 4.35 optimal patch: {len(changed)} changed files; {len(manifest['preserved'])} unchanged files.")
