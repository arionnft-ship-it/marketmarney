#!/usr/bin/env python3
"""Apply MarketMarney 4.38 fluid navigation and directional Reels optimizations to 4.37."""
from pathlib import Path
import hashlib
import json
import shutil

from optimize_reels438 import patch_controller

base=Path(__file__).resolve().parent
root=Path('android438')
if not root.exists():
    raise SystemExit('android438 source is missing')

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

replace('app/build.gradle',"applicationId 'com.marketmarney.mobile.beta437'","applicationId 'com.marketmarney.mobile.beta438'")
replace('app/build.gradle','versionCode 41','versionCode 42')
replace('app/build.gradle',"versionName '4.37.0-beta'","versionName '4.38.0-beta'")
replace('app/src/main/res/values/strings.xml','MarketMarney 4.37 Smooth','MarketMarney 4.38 Fluid')

main='app/src/main/java/com/marketmarney/mobile/MainActivity.java'
replace(main,'MarketMarney 4.37.0-beta','MarketMarney 4.38.0-beta')
replace(main,'MarketMarneyAndroid/4.37 AppShell','MarketMarneyAndroid/4.38 AppShell')
replace(main,"version:'4.37'","version:'4.38'")
replace(main,"dataset.mmAndroid='437'","dataset.mmAndroid='438'")
replace(main,"dataset.revision!=='437'","dataset.revision!=='438'",count=2)
replace(main,"dataset.revision='437'","dataset.revision='438'",count=2)

old_assets='depthCss=asset("depth423.css");depthScript=asset("depth423.js");chromeScript=asset("chrome424.js");lightCss=asset("light425.css")+"\\n"+asset("soft426.css")+"\\n"+asset("fast428.css")+"\\n"+asset("social429.css")+"\\n"+asset("home430.css")+"\\n"+asset("reels433.css")+"\\n"+asset("performance435.css")+"\\n"+asset("performance436.css")+"\\n"+asset("smooth437.css");lightScript=asset("light425.js")+"\\n"+asset("social429.js")+"\\n"+asset("home430.js")+"\\n"+asset("reels433.js")+"\\n"+asset("lifecycle435.js")+"\\n"+asset("runtime436.js");'
new_assets='depthCss=asset("depth423.css");depthScript=asset("depth423.js");chromeScript=asset("chrome424.js");lightCss=asset("light425.css")+"\\n"+asset("soft426.css")+"\\n"+asset("fast428.css")+"\\n"+asset("social429.css")+"\\n"+asset("home430.css")+"\\n"+asset("reels433.css")+"\\n"+asset("performance435.css")+"\\n"+asset("performance436.css")+"\\n"+asset("smooth437.css")+"\\n"+asset("fluid438.css");lightScript=asset("light425.js")+"\\n"+asset("social429.js")+"\\n"+asset("home430.js")+"\\n"+asset("reels433.js")+"\\n"+asset("lifecycle435.js")+"\\n"+asset("runtime436.js");'
replace(main,old_assets,new_assets)

replace(main,
'if(Build.VERSION.SDK_INT>=26)web.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT,true);',
'if(Build.VERSION.SDK_INT>=26)web.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT,lowRamDevice);')

replace(main,
'            while(retained.size()>1){Integer key=retained.keySet().iterator().next();discardView(retained.remove(key));}',
'            int retainLimit=lowRamDevice||nativePowerSave?1:2;while(retained.size()>retainLimit){Integer key=retained.keySet().iterator().next();discardView(retained.remove(key));}')

old_nav='''        cancelPageWait();navigationStarted=SystemClock.uptimeMillis();
        if(allowSharedIndex&&(selected!=tab||pending)&&useLoadedIndex(selected,sequence))return;
'''
new_nav='''        cancelPageWait();navigationStarted=SystemClock.uptimeMillis();
        if(selected==tab&&!pending&&web!=null&&own(web.getUrl())){
            if(firstPaint){resumePage(web);progress.setVisibility(View.GONE);}else progress.setVisibility(View.VISIBLE);
            drawTabs();Log.i("MM438_NAV","same tab="+tab+" reused");return;
        }
        if(allowSharedIndex&&(selected!=tab||pending)&&useLoadedIndex(selected,sequence))return;
'''
replace(main,old_nav,new_nav)

old_open='    private void open(String url){if(web==null||!own(url))return;navigationSequence++;pendingIndexTab=-1;beginPageWait(web);lastUrl=url;if(offline!=null){frame.removeView(offline);offline=null;}web.setVisibility(View.VISIBLE);progress.setVisibility(View.VISIBLE);web.loadUrl(url);}'
new_open='''    private void open(String url){
        if(web==null||!own(url))return;
        String current=web.getUrl();
        if(url.equals(current)&&!mainFailed){lastUrl=url;if(firstPaint){clearOffline();progress.setVisibility(View.GONE);resumePage(web);}return;}
        navigationSequence++;pendingIndexTab=-1;beginPageWait(web);lastUrl=url;clearOffline();web.setVisibility(View.VISIBLE);progress.setVisibility(View.VISIBLE);web.loadUrl(url);
    }'''
replace(main,old_open,new_open)

startup='app/src/main/java/com/marketmarney/mobile/StartupOverlay.java'
replace(startup,'MarketMarney 4.37 opening','MarketMarney 4.38 opening')
replace(startup,'MM437_LAUNCH','MM438_LAUNCH',count=2)
replace(startup,
'''        if(fade&&motionAllowed(getContext())&&isAttachedToWindow()){
            animate().alpha(0f).setDuration(100).withEndAction(this::removeNow).start();
        }else{
            removeNow();
        }
''',
'''        if(fade&&motionAllowed(getContext())&&isAttachedToWindow()){
            animate().alpha(0f).setDuration(100).withEndAction(this::removeNow).start();
            // Some overloaded WebView/renderer frames may drop an animation end
            // callback. Always remove the opening shortly afterwards as a bounded
            // fallback so it can never cover the application indefinitely.
            postDelayed(this::removeNow,220);
        }else{
            removeNow();
        }
''')

version_tests=[]
for test_file in (root/'app/src/androidTest/java').rglob('*.java'):
    text=test_file.read_text(encoding='utf-8')
    updated=text.replace('4.37.0-beta','4.38.0-beta').replace('com.marketmarney.mobile.beta437','com.marketmarney.mobile.beta438')
    if updated!=text:
        test_file.write_text(updated,encoding='utf-8')
        version_tests.append(test_file.relative_to(root).as_posix())

assets=root/'app/src/main/assets'
for rel in ['reels46.js','social411/app.js','social411/bundle427.js']:
    patch_controller(assets/rel)
shutil.copy2(base/'fluid438.css',assets/'fluid438.css')
test_root=root/'app/src/androidTest/java/com/marketmarney/mobile'
test_root.mkdir(parents=True,exist_ok=True)
shutil.copy2(base/'Performance438Test.java',test_root/'Performance438Test.java')
shutil.copy2(base/'Reels433LayoutTest.java',test_root/'Reels433LayoutTest.java')
shutil.copy2(base/'Marney438-Panduan.md',root/'README-MULAI-DISINI.md')

after=inventory()
changed=sorted(set(before)^set(after)|{p for p in set(before)&set(after) if before[p]!=after[p]})
expected={
    'README-MULAI-DISINI.md','app/build.gradle',
    'app/src/main/java/com/marketmarney/mobile/MainActivity.java',
    'app/src/main/java/com/marketmarney/mobile/StartupOverlay.java',
    'app/src/main/res/values/strings.xml',
    'app/src/main/assets/reels46.js','app/src/main/assets/social411/app.js','app/src/main/assets/social411/bundle427.js',
    'app/src/main/assets/fluid438.css',
    'app/src/androidTest/java/com/marketmarney/mobile/Performance438Test.java',
    'app/src/androidTest/java/com/marketmarney/mobile/Reels433LayoutTest.java',
}
expected.update(version_tests)
assert changed==sorted(expected),{'unexpected':sorted(set(changed)-expected),'missing':sorted(expected-set(changed))}
manifest={
    'release':'4.38.0-beta','package':'com.marketmarney.mobile.beta438','baseRelease':'4.37.0-beta',
    'purpose':'Use direction-aware Reel buffering, activation hysteresis, scroll-settle selection, feed rendering containment, duplicate-navigation guards, an adaptive two-tab warm cache on capable devices, and a bounded opening-removal fallback.',
    'changed':[{'path':rel,'beforeSha256':before.get(rel),'afterSha256':after.get(rel)} for rel in changed],
    'preserved':{rel:sha for rel,sha in sorted(before.items()) if rel not in changed},
}
Path('verified438.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(f"Verified 4.38 fluid patch: {len(changed)} changed files; {len(manifest['preserved'])} unchanged files.")
