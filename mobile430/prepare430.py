#!/usr/bin/env python3
from pathlib import Path
import hashlib, json, shutil

base=Path(__file__).resolve().parent
root=Path('android430')
if not root.exists():
    raise SystemExit('android430 source is missing')

def read(rel): return (root/rel).read_text(encoding='utf-8')
def write(rel,text):
    path=root/rel;path.parent.mkdir(parents=True,exist_ok=True);path.write_text(text,encoding='utf-8')
def replace(rel,old,new,count=1):
    text=read(rel);actual=text.count(old)
    assert actual==count,f'{rel}: expected {count}, found {actual}: {old[:160]!r}'
    write(rel,text.replace(old,new))
def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def snapshot(): return {p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}

before=snapshot()
replace('app/build.gradle',"applicationId 'com.marketmarney.mobile.beta429'","applicationId 'com.marketmarney.mobile.beta430'")
replace('app/build.gradle','versionCode 33','versionCode 34')
replace('app/build.gradle',"versionName '4.29.0-beta'","versionName '4.30.0-beta'")
replace('app/src/main/res/values/strings.xml','Marney 4.29 Media','Marney 4.30 Media')

main='app/src/main/java/com/marketmarney/mobile/MainActivity.java'
replace(main,'MarketMarney 4.29.0-beta','MarketMarney 4.30.0-beta')
replace(main,'MarketMarneyAndroid/4.29 AppShell','MarketMarneyAndroid/4.30 AppShell')
replace(main,"version:'4.29'","version:'4.30'")
replace(main,"dataset.mmAndroid='429'","dataset.mmAndroid='430'")
replace(main,"dataset.revision!=='429'","dataset.revision!=='430'",count=2)
replace(main,"dataset.revision='429'","dataset.revision='430'",count=2)
replace(main,
    'lightCss=asset("light425.css")+"\\n"+asset("soft426.css")+"\\n"+asset("fast428.css")+"\\n"+asset("social429.css");lightScript=asset("light425.js")+"\\n"+asset("social429.js");',
    'lightCss=asset("light425.css")+"\\n"+asset("soft426.css")+"\\n"+asset("fast428.css")+"\\n"+asset("social429.css")+"\\n"+asset("home430.css");lightScript=asset("light425.js")+"\\n"+asset("social429.js")+"\\n"+asset("home430.js");')
replace(main,
    'String h=u.getFragment();',
    'String h=u.getFragment();\n                        if("mm-app-home".equals(h)){navigate(HOME);return true;}')

startup='app/src/main/java/com/marketmarney/mobile/StartupOverlay.java'
replace(startup,'MM429_LAUNCH','MM430_LAUNCH',count=2)

# Keep inherited version assertions aligned with this release.
test_root=root/'app/src/androidTest/java'
for test_file in test_root.rglob('*.java'):
    text=test_file.read_text(encoding='utf-8')
    updated=text.replace('4.29.0-beta','4.30.0-beta')
    if updated!=text:test_file.write_text(updated,encoding='utf-8')

assets=root/'app/src/main/assets'
shutil.copy2(base/'home430.css',assets/'home430.css')
shutil.copy2(base/'home430.js',assets/'home430.js')
target=root/'app/src/androidTest/java/com/marketmarney/mobile/Social430HomeButtonTest.java'
target.parent.mkdir(parents=True,exist_ok=True)
shutil.copy2(base/'Social430HomeButtonTest.java',target)

after=snapshot();changed=[];preserved={}
for rel,sha in before.items():
    if after.get(rel)==sha:preserved[rel]=sha
    else:changed.append({'path':rel,'beforeSha256':sha,'afterSha256':after.get(rel)})
for rel,sha in after.items():
    if rel not in before:changed.append({'path':rel,'beforeSha256':None,'afterSha256':sha})
manifest={'release':'4.30.0-beta','package':'com.marketmarney.mobile.beta430','preserved':preserved,'changed':sorted(changed,key=lambda x:x['path'])}
Path('verified430.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(f"Verified 4.30 Social home-button patch: {len(changed)} changed files; {len(preserved)} unchanged files.")
