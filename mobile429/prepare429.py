#!/usr/bin/env python3
from pathlib import Path
import hashlib, json, shutil

base = Path(__file__).resolve().parent
root = Path('android429')
if not root.exists():
    raise SystemExit('android429 source is missing')

def read(rel):
    return (root / rel).read_text(encoding='utf-8')

def write(rel, text):
    path = root / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding='utf-8')

def replace(rel, old, new, count=1):
    text = read(rel)
    actual = text.count(old)
    assert actual == count, f'{rel}: expected {count}, found {actual}: {old[:150]!r}'
    write(rel, text.replace(old, new))

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def snapshot():
    return {p.relative_to(root).as_posix(): digest(p) for p in root.rglob('*') if p.is_file()}

before = snapshot()

replace('app/build.gradle', "applicationId 'com.marketmarney.mobile.beta428'", "applicationId 'com.marketmarney.mobile.beta429'")
replace('app/build.gradle', 'versionCode 32', 'versionCode 33')
replace('app/build.gradle', "versionName '4.28.0-beta'", "versionName '4.29.0-beta'")
replace('app/src/main/res/values/strings.xml', 'Marney 4.28 Social', 'Marney 4.29 Media')

main = 'app/src/main/java/com/marketmarney/mobile/MainActivity.java'
replace(main,
    'private final String[] paths={"/index.html",NEWS_PATH,XAUWAR_PATH,"/index.html#marketlive","/beranda-trader.html"};',
    'private final String[] paths={"/index.html",NEWS_PATH,XAUWAR_PATH,"/index.html#marketlive","/beranda-trader.html#mm44-feed"};')
replace(main, 'MarketMarney 4.28.0-beta', 'MarketMarney 4.29.0-beta')
replace(main,
    'if(bottom!=null&&fullVideo==null)bottom.setVisibility(i.isVisible(WindowInsets.Type.ime())?View.GONE:View.VISIBLE);',
    'if(bottom!=null&&fullVideo==null)bottom.setVisibility(i.isVisible(WindowInsets.Type.ime())||tab==SOCIAL?View.GONE:View.VISIBLE);')
replace(main,
    'private void drawTabs(){\n        bottom.removeAllViews();',
    'private void drawTabs(){\n        bottom.removeAllViews();\n        if(tab==SOCIAL){bottom.setVisibility(View.GONE);return;}\n        bottom.setVisibility(View.VISIBLE);')
replace(main,
    'depthCss=asset("depth423.css");depthScript=asset("depth423.js");chromeScript=asset("chrome424.js");lightCss=asset("light425.css")+"\\n"+asset("soft426.css")+"\\n"+asset("fast428.css");lightScript=asset("light425.js");',
    'depthCss=asset("depth423.css");depthScript=asset("depth423.js");chromeScript=asset("chrome424.js");lightCss=asset("light425.css")+"\\n"+asset("soft426.css")+"\\n"+asset("fast428.css")+"\\n"+asset("social429.css");lightScript=asset("light425.js")+"\\n"+asset("social429.js");')
replace(main,
    'if(bottom!=null)bottom.setBackground(DepthStyle423.tray(this,true));',
    'if(bottom!=null){bottom.setBackground(DepthStyle423.tray(this,true));bottom.setVisibility(tab==SOCIAL?View.GONE:View.VISIBLE);}')
replace(main, 'MarketMarneyAndroid/4.28 AppShell', 'MarketMarneyAndroid/4.29 AppShell')
replace(main, "version:'4.28'", "version:'4.29'")
replace(main, "dataset.mmAndroid='428'", "dataset.mmAndroid='429'")
replace(main, "dataset.revision!=='428'", "dataset.revision!=='429'", count=2)
replace(main, "dataset.revision='428'", "dataset.revision='429'", count=2)

startup = 'app/src/main/java/com/marketmarney/mobile/StartupOverlay.java'
replace(startup, 'MM428_LAUNCH', 'MM429_LAUNCH', count=2)

# Keep inherited regression tests aligned with the current application report.
test_root=root/'app/src/androidTest/java'
for test_file in test_root.rglob('*.java'):
    text=test_file.read_text(encoding='utf-8')
    updated=text.replace('MarketMarney 4.28.0-beta','MarketMarney 4.29.0-beta')
    if updated!=text:
        test_file.write_text(updated,encoding='utf-8')

assets = root / 'app/src/main/assets'
shutil.copy2(base / 'social429.css', assets / 'social429.css')
shutil.copy2(base / 'social429.js', assets / 'social429.js')

test_target = root / 'app/src/androidTest/java/com/marketmarney/mobile/Social429FullscreenTest.java'
test_target.parent.mkdir(parents=True, exist_ok=True)
shutil.copy2(base / 'Social429FullscreenTest.java', test_target)

after = snapshot()
changed = []
preserved = {}
for rel, sha in before.items():
    if after.get(rel) == sha:
        preserved[rel] = sha
    else:
        changed.append({'path': rel, 'beforeSha256': sha, 'afterSha256': after.get(rel)})
for rel, sha in after.items():
    if rel not in before:
        changed.append({'path': rel, 'beforeSha256': None, 'afterSha256': sha})
manifest = {
    'release': '4.29.0-beta',
    'package': 'com.marketmarney.mobile.beta429',
    'preserved': preserved,
    'changed': sorted(changed, key=lambda x: x['path'])
}
Path('verified429.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print(f"Verified 4.29 full-screen Social patch: {len(changed)} changed files; {len(preserved)} unchanged files.")
