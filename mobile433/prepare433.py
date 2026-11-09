#!/usr/bin/env python3
from pathlib import Path
import hashlib
import json
import shutil

base=Path(__file__).resolve().parent
root=Path('android433')
if not root.exists():
    raise SystemExit('android433 source is missing')

def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def read(rel): return (root/rel).read_text(encoding='utf-8')
def write(rel,text):
    path=root/rel
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(text,encoding='utf-8')
def replace(rel,old,new,count=1):
    text=read(rel)
    actual=text.count(old)
    assert actual==count,f'{rel}: expected {count}, found {actual}: {old[:160]!r}'
    write(rel,text.replace(old,new))
def snapshot(): return {p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}

before=snapshot()
replace('app/build.gradle',"applicationId 'com.marketmarney.mobile.beta432'","applicationId 'com.marketmarney.mobile.beta433'")
replace('app/build.gradle','versionCode 36','versionCode 37')
replace('app/build.gradle',"versionName '4.32.0-beta'","versionName '4.33.0-beta'")
replace('app/src/main/res/values/strings.xml','MarketMarney 4.32','MarketMarney 4.33 Reels')

main='app/src/main/java/com/marketmarney/mobile/MainActivity.java'
replace(main,'MarketMarney 4.32.0-beta','MarketMarney 4.33.0-beta')
replace(main,'MarketMarneyAndroid/4.32 AppShell','MarketMarneyAndroid/4.33 AppShell')
replace(main,"version:'4.32'","version:'4.33'")
replace(main,"dataset.mmAndroid='432'","dataset.mmAndroid='433'")
replace(main,"dataset.revision!=='432'","dataset.revision!=='433'",count=2)
replace(main,"dataset.revision='432'","dataset.revision='433'",count=2)
replace(main,
    'depthCss=asset("depth423.css");depthScript=asset("depth423.js");chromeScript=asset("chrome424.js");lightCss=asset("light425.css")+"\\n"+asset("soft426.css")+"\\n"+asset("fast428.css")+"\\n"+asset("social429.css")+"\\n"+asset("home430.css");lightScript=asset("light425.js")+"\\n"+asset("social429.js")+"\\n"+asset("home430.js");',
    'depthCss=asset("depth423.css");depthScript=asset("depth423.js");chromeScript=asset("chrome424.js");lightCss=asset("light425.css")+"\\n"+asset("soft426.css")+"\\n"+asset("fast428.css")+"\\n"+asset("social429.css")+"\\n"+asset("home430.css")+"\\n"+asset("reels433.css");lightScript=asset("light425.js")+"\\n"+asset("social429.js")+"\\n"+asset("home430.js")+"\\n"+asset("reels433.js");')

startup='app/src/main/java/com/marketmarney/mobile/StartupOverlay.java'
replace(startup,'MarketMarney 4.32 opening','MarketMarney 4.33 opening')
replace(startup,'MM432_LAUNCH','MM433_LAUNCH',count=2)

version_tests=[]
test_root=root/'app/src/androidTest/java'
for test_file in test_root.rglob('*.java'):
    text=test_file.read_text(encoding='utf-8')
    updated=text.replace('4.32.0-beta','4.33.0-beta')
    if updated!=text:
        test_file.write_text(updated,encoding='utf-8')
        version_tests.append(test_file.relative_to(root).as_posix())

assets=root/'app/src/main/assets'
shutil.copy2(base/'reels433.css',assets/'reels433.css')
shutil.copy2(base/'reels433.js',assets/'reels433.js')
test_target=root/'app/src/androidTest/java/com/marketmarney/mobile/Reels433LayoutTest.java'
test_target.parent.mkdir(parents=True,exist_ok=True)
shutil.copy2(base/'Reels433LayoutTest.java',test_target)
shutil.copy2(base/'Marney433-Panduan.md',root/'README-MULAI-DISINI.md')

after=snapshot()
changed=sorted(set(before)^set(after)|{p for p in set(before)&set(after) if before[p]!=after[p]})
expected={
    'README-MULAI-DISINI.md',
    'app/build.gradle',
    'app/src/main/java/com/marketmarney/mobile/MainActivity.java',
    'app/src/main/java/com/marketmarney/mobile/StartupOverlay.java',
    'app/src/main/res/values/strings.xml',
    'app/src/main/assets/reels433.css',
    'app/src/main/assets/reels433.js',
    'app/src/androidTest/java/com/marketmarney/mobile/Reels433LayoutTest.java',
}
expected.update(version_tests)
assert changed==sorted(expected),{
    'unexpected':sorted(set(changed)-expected),
    'missing':sorted(expected-set(changed)),
}
manifest={
    'release':'4.33.0-beta',
    'package':'com.marketmarney.mobile.beta433',
    'purpose':'Remove the duplicate Social header from Reels, restore visible controls, use a light dock, maximize video space, and repair Reels navigation/upload actions.',
    'changed':[{'path':rel,'beforeSha256':before.get(rel),'afterSha256':after.get(rel)} for rel in changed],
    'preserved':{rel:sha for rel,sha in sorted(before.items()) if rel not in changed},
}
Path('verified433.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(f"Verified 4.33 Reels patch: {len(changed)} changed files; {len(manifest['preserved'])} unchanged files.")
