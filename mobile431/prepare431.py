#!/usr/bin/env python3
from pathlib import Path
import hashlib
import json
import shutil

base=Path(__file__).resolve().parent
root=Path('android431')
if not root.exists():
    raise SystemExit('android431 source is missing')

def read(rel):
    return (root/rel).read_text(encoding='utf-8')

def write(rel,text):
    path=root/rel
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(text,encoding='utf-8')

def replace(rel,old,new,count=1):
    text=read(rel)
    actual=text.count(old)
    assert actual==count,f'{rel}: expected {count}, found {actual}: {old[:160]!r}'
    write(rel,text.replace(old,new))

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def snapshot():
    return {p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}

before=snapshot()

replace('app/build.gradle',"applicationId 'com.marketmarney.mobile.beta430'","applicationId 'com.marketmarney.mobile.beta431'")
replace('app/build.gradle','versionCode 34','versionCode 35')
replace('app/build.gradle',"versionName '4.30.0-beta'","versionName '4.31.0-beta'")
replace('app/src/main/res/values/strings.xml','Marney 4.30 Media','Marney 4.31 Simple')

main='app/src/main/java/com/marketmarney/mobile/MainActivity.java'
replace(main,'MarketMarney 4.30.0-beta','MarketMarney 4.31.0-beta')
replace(main,'MarketMarneyAndroid/4.30 AppShell','MarketMarneyAndroid/4.31 AppShell')
replace(main,"version:'4.30'","version:'4.31'")
replace(main,"dataset.mmAndroid='430'","dataset.mmAndroid='431'")
replace(main,"dataset.revision!=='430'","dataset.revision!=='431'",count=2)
replace(main,"dataset.revision='430'","dataset.revision='431'",count=2)

version_tests=[]
test_root=root/'app/src/androidTest/java'
for test_file in test_root.rglob('*.java'):
    text=test_file.read_text(encoding='utf-8')
    updated=text.replace('4.30.0-beta','4.31.0-beta')
    if updated!=text:
        test_file.write_text(updated,encoding='utf-8')
        version_tests.append(test_file.relative_to(root).as_posix())

shutil.copy2(base/'StartupOverlay.java',root/'app/src/main/java/com/marketmarney/mobile/StartupOverlay.java')
shutil.copy2(base/'OpeningSoft426Test.java',root/'app/src/androidTest/java/com/marketmarney/mobile/OpeningSoft426Test.java')
shutil.copy2(base/'Marney431-Panduan.md',root/'README-MULAI-DISINI.md')

after=snapshot()
changed=sorted(set(before)^set(after)|{p for p in set(before)&set(after) if before[p]!=after[p]})
expected={
    'README-MULAI-DISINI.md',
    'app/build.gradle',
    'app/src/main/java/com/marketmarney/mobile/MainActivity.java',
    'app/src/main/java/com/marketmarney/mobile/StartupOverlay.java',
    'app/src/main/res/values/strings.xml',
    'app/src/androidTest/java/com/marketmarney/mobile/OpeningSoft426Test.java',
}
expected.update(version_tests)
assert changed==sorted(expected),{
    'unexpected':sorted(set(changed)-expected),
    'missing':sorted(expected-set(changed)),
}

manifest={
    'release':'4.31.0-beta',
    'package':'com.marketmarney.mobile.beta431',
    'purpose':'Simple light opening with logo, MARNEY name, and one short tagline only.',
    'changed':[
        {'path':rel,'beforeSha256':before.get(rel),'afterSha256':after.get(rel)}
        for rel in changed
    ],
    'preserved':{
        rel:sha for rel,sha in sorted(before.items()) if rel not in changed
    },
}
Path('verified431.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(f"Verified 4.31 simple-opening patch: {len(changed)} changed files; {len(manifest['preserved'])} unchanged files.")
