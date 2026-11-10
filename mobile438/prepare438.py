#!/usr/bin/env python3
"""Apply MarketMarney 4.38 adaptive playback and app-shell refinements to 4.37."""
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
replace('app/src/main/res/values/strings.xml','MarketMarney 4.37 Smooth','MarketMarney 4.38 Adaptive')

main='app/src/main/java/com/marketmarney/mobile/MainActivity.java'
replace(main,'MarketMarney 4.37.0-beta','MarketMarney 4.38.0-beta')
replace(main,'MarketMarneyAndroid/4.37 AppShell','MarketMarneyAndroid/4.38 AppShell')
replace(main,"version:'4.37'","version:'4.38'")
replace(main,"dataset.mmAndroid='437'","dataset.mmAndroid='438'")
replace(main,"dataset.revision!=='437'","dataset.revision!=='438'",count=2)
replace(main,"dataset.revision='437'","dataset.revision='438'",count=2)
replace(main,
    '+"\\n"+asset("smooth437.css");lightScript=',
    '+"\\n"+asset("smooth437.css")+"\\n"+asset("adaptive438.css");lightScript=')
replace(main,
    'if(socialAssetExecutor==null)socialAssetExecutor=java.util.concurrent.Executors.newSingleThreadExecutor();',
    '''if(socialAssetExecutor==null)socialAssetExecutor=java.util.concurrent.Executors.newSingleThreadExecutor(r->{
                Thread thread=new Thread(()->{android.os.Process.setThreadPriority(android.os.Process.THREAD_PRIORITY_BACKGROUND);r.run();},"MarneySocialAssets");
                thread.setDaemon(true);return thread;
            });''')
replace(main,
    'if(tab!=SOCIAL&&!socialAssetsReady)frame.postDelayed(this::preloadSocialAssets,650);',
    'if(tab!=SOCIAL&&!socialAssetsReady)frame.postDelayed(this::preloadSocialAssets,900);')

manifest='app/src/main/AndroidManifest.xml'
replace(manifest,
    '            android:exported="true"\n            android:label="@string/app_name">',
    '            android:exported="true"\n            android:label="@string/app_name"\n            android:windowSoftInputMode="adjustResize">')

startup='app/src/main/java/com/marketmarney/mobile/StartupOverlay.java'
replace(startup,'MarketMarney 4.37 opening','MarketMarney 4.38 opening')
replace(startup,'MM437_LAUNCH','MM438_LAUNCH',count=2)

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
shutil.copy2(base/'adaptive438.css',assets/'adaptive438.css')
new_test=root/'app/src/androidTest/java/com/marketmarney/mobile/Performance438Test.java'
new_test.parent.mkdir(parents=True,exist_ok=True)
shutil.copy2(base/'Performance438Test.java',new_test)
shutil.copy2(base/'Marney438-Panduan.md',root/'README-MULAI-DISINI.md')

after=inventory()
changed=sorted(set(before)^set(after)|{p for p in set(before)&set(after) if before[p]!=after[p]})
expected={
    'README-MULAI-DISINI.md','app/build.gradle','app/src/main/AndroidManifest.xml',
    'app/src/main/java/com/marketmarney/mobile/MainActivity.java',
    'app/src/main/java/com/marketmarney/mobile/StartupOverlay.java',
    'app/src/main/res/values/strings.xml',
    'app/src/main/assets/reels46.js','app/src/main/assets/social411/app.js','app/src/main/assets/social411/bundle427.js',
    'app/src/main/assets/adaptive438.css',
    'app/src/androidTest/java/com/marketmarney/mobile/Performance438Test.java',
}
expected.update(version_tests)
assert changed==sorted(expected),{'unexpected':sorted(set(changed)-expected),'missing':sorted(expected-set(changed))}
manifest_data={
    'release':'4.38.0-beta','package':'com.marketmarney.mobile.beta438','baseRelease':'4.37.0-beta',
    'purpose':'Gate heavy Reel preloading behind real active-video buffer, prioritize the user swipe direction, try a bounded soft playback resume before media reload, lower background Social asset preload priority, and keep chat inputs visible with adjustResize.',
    'changed':[{'path':rel,'beforeSha256':before.get(rel),'afterSha256':after.get(rel)} for rel in changed],
    'preserved':{rel:sha for rel,sha in sorted(before.items()) if rel not in changed},
}
Path('verified438.json').write_text(json.dumps(manifest_data,indent=2)+'\n',encoding='utf-8')
print(f"Verified 4.38 adaptive patch: {len(changed)} changed files; {len(manifest_data['preserved'])} unchanged files.")
