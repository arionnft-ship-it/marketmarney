#!/usr/bin/env python3
"""Apply the MarketMarney 4.34 bounded-buffer and WebView performance patch."""
from pathlib import Path
import hashlib
import json
import shutil

from optimize_reels434 import patch_controller

base=Path(__file__).resolve().parent
root=Path('android434')
if not root.exists():
    raise SystemExit('android434 source is missing')

def digest(path:Path)->str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def inventory():
    return {p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}

def read(rel:str)->str:
    return (root/rel).read_text(encoding='utf-8')

def write(rel:str,text:str)->None:
    path=root/rel
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(text,encoding='utf-8')

def replace(rel:str,old:str,new:str,count:int=1)->None:
    text=read(rel)
    actual=text.count(old)
    assert actual==count,f'{rel}: expected {count}, found {actual}: {old[:140]!r}'
    write(rel,text.replace(old,new,count))

before=inventory()

replace('app/build.gradle',"applicationId 'com.marketmarney.mobile.beta433'","applicationId 'com.marketmarney.mobile.beta434'")
replace('app/build.gradle','versionCode 37','versionCode 38')
replace('app/build.gradle',"versionName '4.33.0-beta'","versionName '4.34.0-beta'")
replace('app/src/main/res/values/strings.xml','MarketMarney 4.33 Reels','MarketMarney 4.34 Performance')

main='app/src/main/java/com/marketmarney/mobile/MainActivity.java'
replace(main,'MarketMarney 4.33.0-beta','MarketMarney 4.34.0-beta')
replace(main,'MarketMarneyAndroid/4.33 AppShell','MarketMarneyAndroid/4.34 AppShell')
replace(main,"version:'4.33'","version:'4.34'")
replace(main,"dataset.mmAndroid='433'","dataset.mmAndroid='434'")
replace(main,"dataset.revision!=='433'","dataset.revision!=='434'",count=2)
replace(main,"dataset.revision='433'","dataset.revision='434'",count=2)
replace(main,
    'WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setLoadsImagesAutomatically(true);s.setCacheMode(WebSettings.LOAD_DEFAULT);',
    'WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setLoadsImagesAutomatically(true);s.setCacheMode(WebSettings.LOAD_DEFAULT);s.setDatabaseEnabled(true);web.setOverScrollMode(View.OVER_SCROLL_NEVER);web.setVerticalScrollBarEnabled(false);web.setHorizontalScrollBarEnabled(false);')

startup='app/src/main/java/com/marketmarney/mobile/StartupOverlay.java'
replace(startup,'MarketMarney 4.33 opening','MarketMarney 4.34 opening')
replace(startup,'MM433_LAUNCH','MM434_LAUNCH',count=2)

version_tests=[]
for test_file in (root/'app/src/androidTest/java').rglob('*.java'):
    text=test_file.read_text(encoding='utf-8')
    updated=text.replace('4.33.0-beta','4.34.0-beta')
    if updated!=text:
        test_file.write_text(updated,encoding='utf-8')
        version_tests.append(test_file.relative_to(root).as_posix())

assets=root/'app/src/main/assets'
for rel in ['reels46.js','social411/app.js','social411/bundle427.js']:
    patch_controller(assets/rel)

# Fail faster on a genuinely stalled active video and observe only the Reels feed,
# not every DOM update across the entire Social page.
replace('app/src/main/assets/reels433.js','  },8000);','  },5000);')
replace('app/src/main/assets/reels433.js',
    " if(document.body)bodyObserver.observe(document.body,{childList:true,subtree:true});",
    " var reelRoot=document.getElementById('shReelFeed')||document.body;if(reelRoot)bodyObserver.observe(reelRoot,{childList:true,subtree:true});")

perf=(base/'performance434.css').read_text(encoding='utf-8').rstrip()+'\n'
for rel in ['app/src/main/assets/social411/app.css','app/src/main/assets/social411/bundle427.css']:
    text=read(rel)
    assert 'MarketMarney 4.34' not in text,rel
    write(rel,text.rstrip()+'\n\n'+perf)
shutil.copy2(base/'performance434.css',assets/'performance434.css')

new_test=root/'app/src/androidTest/java/com/marketmarney/mobile/Reels434PerformanceTest.java'
new_test.parent.mkdir(parents=True,exist_ok=True)
shutil.copy2(base/'Reels434PerformanceTest.java',new_test)
shutil.copy2(base/'Marney434-Panduan.md',root/'README-MULAI-DISINI.md')

after=inventory()
changed=sorted(set(before)^set(after)|{p for p in set(before)&set(after) if before[p]!=after[p]})
expected={
    'README-MULAI-DISINI.md',
    'app/build.gradle',
    'app/src/main/java/com/marketmarney/mobile/MainActivity.java',
    'app/src/main/java/com/marketmarney/mobile/StartupOverlay.java',
    'app/src/main/res/values/strings.xml',
    'app/src/main/assets/reels46.js',
    'app/src/main/assets/reels433.js',
    'app/src/main/assets/social411/app.js',
    'app/src/main/assets/social411/bundle427.js',
    'app/src/main/assets/social411/app.css',
    'app/src/main/assets/social411/bundle427.css',
    'app/src/main/assets/performance434.css',
    'app/src/androidTest/java/com/marketmarney/mobile/Reels434PerformanceTest.java',
}
expected.update(version_tests)
assert changed==sorted(expected),{
    'unexpected':sorted(set(changed)-expected),
    'missing':sorted(expected-set(changed)),
}
manifest={
    'release':'4.34.0-beta',
    'package':'com.marketmarney.mobile.beta434',
    'baseRelease':'4.33.0-beta',
    'purpose':'Use a bounded adaptive three-to-four Reel buffer, delay destructive media release, preload the active and next Reel, reduce Social rendering work, scope observers, and enable the WebView database/cache path without changing the public website or database.',
    'changed':[{'path':rel,'beforeSha256':before.get(rel),'afterSha256':after.get(rel)} for rel in changed],
    'preserved':{rel:sha for rel,sha in sorted(before.items()) if rel not in changed},
}
Path('verified434.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(f"Verified 4.34 performance patch: {len(changed)} changed files; {len(manifest['preserved'])} unchanged files.")
