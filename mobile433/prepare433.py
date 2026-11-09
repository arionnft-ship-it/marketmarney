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
    path=root/rel;path.parent.mkdir(parents=True,exist_ok=True);path.write_text(text,encoding='utf-8')
def replace(rel,old,new,count=1):
    text=read(rel);actual=text.count(old)
    assert actual==count,f'{rel}: expected {count}, found {actual}: {old[:180]!r}'
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
    'lightCss=asset("light425.css")+"\\n"+asset("soft426.css")+"\\n"+asset("fast428.css")+"\\n"+asset("social429.css")+"\\n"+asset("home430.css");lightScript=asset("light425.js")+"\\n"+asset("social429.js")+"\\n"+asset("home430.js");',
    'lightCss=asset("light425.css")+"\\n"+asset("soft426.css")+"\\n"+asset("fast428.css")+"\\n"+asset("social429.css")+"\\n"+asset("home430.css")+"\\n"+asset("reels433.css");lightScript=asset("light425.js")+"\\n"+asset("social429.js")+"\\n"+asset("home430.js")+"\\n"+asset("reels433.js");')

assets=root/'app/src/main/assets'
shutil.copy2(base/'reels433.css',assets/'reels433.css')
shutil.copy2(base/'reels433.js',assets/'reels433.js')
target=root/'app/src/androidTest/java/com/marketmarney/mobile/Reels433LayoutTest.java'
target.parent.mkdir(parents=True,exist_ok=True)
shutil.copy2(base/'Reels433LayoutTest.java',target)
shutil.copy2(base/'Marney433-Panduan.md',root/'README-MULAI-DISINI.md')

version_tests=[]
test_root=root/'app/src/androidTest/java'
for test_file in test_root.rglob('*.java'):
    text=test_file.read_text(encoding='utf-8')
    updated=text.replace('4.32.0-beta','4.33.0-beta')
    if updated!=text:
        test_file.write_text(updated,encoding='utf-8')
        version_tests.append(test_file.relative_to(root).as_posix())

after=snapshot()
changed=sorted(set(before)^set(after)|{p for p in set(before)&set(after) if before[p]!=after[p]})
required={
    'README-MULAI-DISINI.md',
    'app/build.gradle',
    'app/src/main/java/com/marketmarney/mobile/MainActivity.java',
    'app/src/main/res/values/strings.xml',
    'app/src/main/assets/reels433.css',
    'app/src/main/assets/reels433.js',
    'app/src/androidTest/java/com/marketmarney/mobile/Reels433LayoutTest.java',
}
allowed=required|set(version_tests)
assert required<=set(changed),{'missing':sorted(required-set(changed))}
assert set(changed)<=allowed,{'unexpected':sorted(set(changed)-allowed)}

manifest={
    'release':'4.33.0-beta',
    'package':'com.marketmarney.mobile.beta433',
    'purpose':'Remove the duplicated Social header from Reels and make its controls compact, flat, readable, and faster to recover from loading states.',
    'changed':[{'path':rel,'beforeSha256':before.get(rel),'afterSha256':after.get(rel)} for rel in changed],
    'preserved':{rel:sha for rel,sha in sorted(before.items()) if rel not in changed},
}
Path('verified433.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(f"Verified 4.33 Reels cleanup patch: {len(changed)} changed files; {len(manifest['preserved'])} unchanged files.")
