#!/usr/bin/env python3
"""Apply MarketMarney 4.39 buffer-priority and instant interaction optimizations."""
from pathlib import Path
import hashlib
import json
import shutil

from optimize_reels439 import patch_controller

base=Path(__file__).resolve().parent
root=Path('android439')
if not root.exists():
    raise SystemExit('android439 source is missing')

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

replace('app/build.gradle',"applicationId 'com.marketmarney.mobile.beta438'","applicationId 'com.marketmarney.mobile.beta439'")
replace('app/build.gradle','versionCode 42','versionCode 43')
replace('app/build.gradle',"versionName '4.38.0-beta'","versionName '4.39.0-beta'")
replace('app/src/main/res/values/strings.xml','MarketMarney 4.38 Fluid','MarketMarney 4.39 Instant')

main='app/src/main/java/com/marketmarney/mobile/MainActivity.java'
replace(main,'MarketMarney 4.38.0-beta','MarketMarney 4.39.0-beta')
replace(main,'MarketMarneyAndroid/4.38 AppShell','MarketMarneyAndroid/4.39 AppShell')
replace(main,"version:'4.38'","version:'4.39'")
replace(main,"dataset.mmAndroid='438'","dataset.mmAndroid='439'")
replace(main,"dataset.revision!=='438'","dataset.revision!=='439'",count=2)
replace(main,"dataset.revision='438'","dataset.revision='439'",count=2)
replace(main,'MM438_NAV','MM439_NAV')
replace(main,'MM438_ASSETS','MM439_ASSETS')

old_assets='depthCss=asset("depth423.css");depthScript=asset("depth423.js");chromeScript=asset("chrome424.js");lightCss=asset("light425.css")+"\\n"+asset("soft426.css")+"\\n"+asset("fast428.css")+"\\n"+asset("social429.css")+"\\n"+asset("home430.css")+"\\n"+asset("reels433.css")+"\\n"+asset("performance435.css")+"\\n"+asset("performance436.css")+"\\n"+asset("smooth437.css")+"\\n"+asset("fluid438.css");lightScript=asset("light425.js")+"\\n"+asset("social429.js")+"\\n"+asset("home430.js")+"\\n"+asset("reels433.js")+"\\n"+asset("lifecycle435.js")+"\\n"+asset("runtime436.js");'
new_assets='depthCss=asset("depth423.css");depthScript=asset("depth423.js");chromeScript=asset("chrome424.js");lightCss=asset("light425.css")+"\\n"+asset("soft426.css")+"\\n"+asset("fast428.css")+"\\n"+asset("social429.css")+"\\n"+asset("home430.css")+"\\n"+asset("reels433.css")+"\\n"+asset("performance435.css")+"\\n"+asset("performance436.css")+"\\n"+asset("smooth437.css")+"\\n"+asset("fluid438.css")+"\\n"+asset("instant439.css");lightScript=asset("light425.js")+"\\n"+asset("social429.js")+"\\n"+asset("home430.js")+"\\n"+asset("reels433.js")+"\\n"+asset("lifecycle435.js")+"\\n"+asset("runtime436.js")+"\\n"+asset("instant439.js");'
replace(main,old_assets,new_assets)

replace(main,
'if(Build.VERSION.SDK_INT>=26)web.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT,lowRamDevice);',
'if(Build.VERSION.SDK_INT>=23&&!lowRamDevice&&!nativePowerSave)web.getSettings().setOffscreenPreRaster(true);\n        if(Build.VERSION.SDK_INT>=26)web.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT,lowRamDevice);')

startup='app/src/main/java/com/marketmarney/mobile/StartupOverlay.java'
replace(startup,'MarketMarney 4.38 opening','MarketMarney 4.39 opening')
replace(startup,'MM438_LAUNCH','MM439_LAUNCH',count=2)

version_tests=[]
for test_file in (root/'app/src/androidTest/java').rglob('*.java'):
    text=test_file.read_text(encoding='utf-8')
    updated=text.replace('4.38.0-beta','4.39.0-beta').replace('com.marketmarney.mobile.beta438','com.marketmarney.mobile.beta439')
    if updated!=text:
        test_file.write_text(updated,encoding='utf-8')
        version_tests.append(test_file.relative_to(root).as_posix())

assets=root/'app/src/main/assets'
for rel in ['reels46.js','social411/app.js','social411/bundle427.js']:
    patch_controller(assets/rel)
shutil.copy2(base/'instant439.css',assets/'instant439.css')
shutil.copy2(base/'instant439.js',assets/'instant439.js')
test_root=root/'app/src/androidTest/java/com/marketmarney/mobile'
test_root.mkdir(parents=True,exist_ok=True)
shutil.copy2(base/'Performance439Test.java',test_root/'Performance439Test.java')
shutil.copy2(base/'Marney439-Panduan.md',root/'README-MULAI-DISINI.md')

after=inventory()
changed=sorted(set(before)^set(after)|{p for p in set(before)&set(after) if before[p]!=after[p]})
expected={
    'README-MULAI-DISINI.md','app/build.gradle',
    'app/src/main/java/com/marketmarney/mobile/MainActivity.java',
    'app/src/main/java/com/marketmarney/mobile/StartupOverlay.java',
    'app/src/main/res/values/strings.xml',
    'app/src/main/assets/reels46.js','app/src/main/assets/social411/app.js','app/src/main/assets/social411/bundle427.js',
    'app/src/main/assets/instant439.css','app/src/main/assets/instant439.js',
    'app/src/androidTest/java/com/marketmarney/mobile/Performance439Test.java',
}
expected.update(version_tests)
assert changed==sorted(expected),{'unexpected':sorted(set(changed)-expected),'missing':sorted(expected-set(changed))}
manifest={
    'release':'4.39.0-beta','package':'com.marketmarney.mobile.beta439','baseRelease':'4.38.0-beta',
    'purpose':'Protect the active Reel when its buffered media is low, stop neighbouring preloads from competing for bandwidth, warm a bounded set of media origins during idle time, reduce tap delay, and pre-rasterize retained WebViews only on capable devices.',
    'changed':[{'path':rel,'beforeSha256':before.get(rel),'afterSha256':after.get(rel)} for rel in changed],
    'preserved':{rel:sha for rel,sha in sorted(before.items()) if rel not in changed},
}
Path('verified439.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(f"Verified 4.39 instant patch: {len(changed)} changed files; {len(manifest['preserved'])} unchanged files.")
