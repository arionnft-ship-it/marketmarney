#!/usr/bin/env python3
"""Apply Marney 4.26 cinematic opening and restrained dimensional styling to verified 4.25."""
from pathlib import Path
import hashlib
import json
import shutil
import sys

root=Path(sys.argv[1]) if len(sys.argv)>1 else Path("android426")
patch=Path(__file__).resolve().parent

def sha(path:Path)->str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def inventory(base:Path):
    return {
        path.relative_to(base).as_posix():sha(path)
        for path in base.rglob("*") if path.is_file()
    }

def replace(relative:str,old:str,new:str,count:int=1):
    path=root/relative
    text=path.read_text()
    actual=text.count(old)
    assert actual==count,f"{relative}: expected {count} occurrence(s), found {actual}: {old[:120]!r}"
    path.write_text(text.replace(old,new,count))

required={
    "app/build.gradle":[
        "applicationId 'com.marketmarney.mobile.beta425'",
        "versionCode 29",
        "versionName '4.25.0-beta'",
    ],
    "app/src/main/java/com/marketmarney/mobile/MainActivity.java":[
        "MarketMarneyAndroid/4.25 AppShell",
        "MarketMarney 4.25.0-beta",
        'lightCss=asset("light425.css");lightScript=asset("light425.js");',
        "window.MarketMarneyApp={platform:'android',version:'4.25'};document.documentElement.dataset.mmAndroid='425';",
    ],
    "app/src/main/res/values/strings.xml":["Marney 4.25 Light"],
    "app/src/main/java/com/marketmarney/mobile/StartupOverlay.java":["class StartupOverlay"],
    "app/src/main/java/com/marketmarney/mobile/DepthStyle423.java":["class DepthStyle423"],
}
for relative,markers in required.items():
    text=(root/relative).read_text()
    for marker in markers:
        assert marker in text,f"Unexpected 4.25 base: {relative} lacks {marker!r}"

new_files={
    "app/src/main/assets/soft426.css",
    "app/src/androidTest/java/com/marketmarney/mobile/OpeningSoft426Test.java",
}
for relative in new_files:
    assert not (root/relative).exists(),relative

before=inventory(root)

replace("app/build.gradle",
        "applicationId 'com.marketmarney.mobile.beta425'",
        "applicationId 'com.marketmarney.mobile.beta426'")
replace("app/build.gradle","versionCode 29","versionCode 30")
replace("app/build.gradle","versionName '4.25.0-beta'","versionName '4.26.0-beta'")
replace("app/src/main/res/values/strings.xml",
        '<string name="app_name">Marney 4.25 Light</string>',
        '<string name="app_name">Marney 4.26</string>')
replace("app/src/androidTest/java/com/marketmarney/mobile/Stability414Test.java",
        'assertTrue(r.contains("4.25.0-beta"))',
        'assertTrue(r.contains("4.26.0-beta"))')

main="app/src/main/java/com/marketmarney/mobile/MainActivity.java"
replace(main,"MarketMarney 4.25.0-beta","MarketMarney 4.26.0-beta")
replace(main,"MarketMarneyAndroid/4.25 AppShell","MarketMarneyAndroid/4.26 AppShell")
replace(main,
        "window.MarketMarneyApp={platform:'android',version:'4.25'};document.documentElement.dataset.mmAndroid='425';",
        "window.MarketMarneyApp={platform:'android',version:'4.26'};document.documentElement.dataset.mmAndroid='426';")
replace(main,
        'lightCss=asset("light425.css");lightScript=asset("light425.js");',
        'lightCss=asset("light425.css")+"\\n"+asset("soft426.css");lightScript=asset("light425.js");')

overrides={
    "app/src/main/java/com/marketmarney/mobile/StartupOverlay.java":"StartupOverlay.java",
    "app/src/main/java/com/marketmarney/mobile/DepthStyle423.java":"DepthStyle423.java",
    "app/src/main/assets/soft426.css":"soft426.css",
    "app/src/androidTest/java/com/marketmarney/mobile/OpeningSoft426Test.java":"OpeningSoft426Test.java",
}
for relative,source_name in overrides.items():
    destination=root/relative
    destination.parent.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(patch/source_name,destination)

shutil.copyfile(patch/"Marney426-Panduan.md",root/"README-MULAI-DISINI.md")

after=inventory(root)
changed=sorted(
    set(before)^set(after) |
    {path for path in set(before)&set(after) if before[path]!=after[path]}
)
expected=sorted({
    "README-MULAI-DISINI.md",
    "app/build.gradle",
    "app/src/androidTest/java/com/marketmarney/mobile/Stability414Test.java",
    "app/src/androidTest/java/com/marketmarney/mobile/OpeningSoft426Test.java",
    "app/src/main/assets/soft426.css",
    "app/src/main/java/com/marketmarney/mobile/MainActivity.java",
    "app/src/main/java/com/marketmarney/mobile/StartupOverlay.java",
    "app/src/main/java/com/marketmarney/mobile/DepthStyle423.java",
    "app/src/main/res/values/strings.xml",
})
assert changed==expected,{
    "unexpected":sorted(set(changed)-set(expected)),
    "missing":sorted(set(expected)-set(changed)),
}

manifest={
    "version":"4.26.0-beta",
    "baseVersion":"4.25.0-beta",
    "purpose":"Cinematic rider-inspired opening with orange glow and restrained 3D throughout the light-only app.",
    "changed":[
        {
            "path":path,
            "beforeSha256":before.get(path),
            "afterSha256":after[path],
        }
        for path in changed
    ],
    "preserved":{
        path:digest for path,digest in sorted(before.items()) if path not in changed
    },
}
Path("verified426.json").write_text(json.dumps(manifest,indent=2)+"\n")
print("Verified 4.26 cinematic/soft-depth patch:",
      len(changed),"changed files;",len(manifest["preserved"]),"unchanged files.")
