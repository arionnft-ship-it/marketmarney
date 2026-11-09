#!/usr/bin/env python3
"""Apply MarketMarney 4.34 bounded-buffer and rendering optimization patch."""
from pathlib import Path
import hashlib
import json
import shutil

base=Path(__file__).resolve().parent
root=Path('android434')
if not root.exists():
    raise SystemExit('android434 source is missing')

def digest(path:Path)->str: return hashlib.sha256(path.read_bytes()).hexdigest()
def inventory(): return {p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}
def read(rel): return (root/rel).read_text(encoding='utf-8')
def write(rel,text):
    path=root/rel;path.parent.mkdir(parents=True,exist_ok=True);path.write_text(text,encoding='utf-8')
def replace(rel,old,new,count=1):
    text=read(rel);actual=text.count(old)
    assert actual==count,f'{rel}: expected {count}, found {actual}: {old[:150]!r}'
    write(rel,text.replace(old,new,count))
def replace_reels_controller(rel,core):
    text=read(rel)
    start='/* Marney Reels 4.6: app-only playback/UI enhancement. Existing server handlers remain owners of likes, comments, sharing and views. */'
    assert text.count(start)==1,(rel,text.count(start))
    if rel=='app/src/main/assets/reels46.js':
        assert text.lstrip().startswith(start)
        write(rel,core.rstrip()+'\n')
        return
    end_marker='/* Marney 4.7: persistent Social header on Reels, messages and group rooms.'
    a=text.index(start);b=text.index(end_marker,a)
    write(rel,text[:a]+core.rstrip()+'\n\n'+text[b:])

before=inventory()

# Version and package identity.
replace('app/build.gradle',"applicationId 'com.marketmarney.mobile.beta433'","applicationId 'com.marketmarney.mobile.beta434'")
replace('app/build.gradle','versionCode 37','versionCode 38')
replace('app/build.gradle',"versionName '4.33.0-beta'","versionName '4.34.0-beta'")
replace('app/src/main/res/values/strings.xml','MarketMarney 4.33 Reels','MarketMarney 4.34 Optimized')

main='app/src/main/java/com/marketmarney/mobile/MainActivity.java'
replace(main,'MarketMarney 4.33.0-beta','MarketMarney 4.34.0-beta')
replace(main,'MarketMarneyAndroid/4.33 AppShell','MarketMarneyAndroid/4.34 AppShell')
replace(main,"version:'4.33'","version:'4.34'")
replace(main,"dataset.mmAndroid='433'","dataset.mmAndroid='434'")
replace(main,"dataset.revision!=='433'","dataset.revision!=='434'",count=2)
replace(main,"dataset.revision='433'","dataset.revision='434'",count=2)
replace(main,'+"\\n"+asset("reels433.css");lightScript=',
             '+"\\n"+asset("reels433.css")+"\\n"+asset("perf434.css");lightScript=')

startup='app/src/main/java/com/marketmarney/mobile/StartupOverlay.java'
replace(startup,'MarketMarney 4.33 opening','MarketMarney 4.34 opening')
replace(startup,'MM433_LAUNCH','MM434_LAUNCH',count=2)

# Existing tests that assert the current app report should follow this release.
version_tests=[]
for test_file in (root/'app/src/androidTest/java').rglob('*.java'):
    text=test_file.read_text(encoding='utf-8')
    updated=text.replace('4.33.0-beta','4.34.0-beta')
    if updated!=text:
        test_file.write_text(updated,encoding='utf-8')
        version_tests.append(test_file.relative_to(root).as_posix())

# Replace the old eager-detach controller in every packaged copy with one smart,
# bounded three-video buffer: active + predicted next + previous.
core=(base/'reels434-core.js').read_text(encoding='utf-8')
for rel in [
    'app/src/main/assets/reels46.js',
    'app/src/main/assets/social411/app.js',
    'app/src/main/assets/social411/bundle427.js',
]:
    replace_reels_controller(rel,core)

# Avoid rebuilding the whole Reels list when returning from the background within
# two minutes, and fetch the list during an idle slot on good connections.
for rel in [
    'app/src/main/assets/social411/5eab9da17fe2c659.js',
    'app/src/main/assets/social411/bundle427.js',
]:
    replace(rel,
        'const connectState={dmUser:null,groupId:null,reelVideoUrl:null,reelObserver:null,reelLoadObserver:null,reelsLoading:false};',
        'const connectState={dmUser:null,groupId:null,reelVideoUrl:null,reelObserver:null,reelLoadObserver:null,reelsLoading:false,reelsLoaded:false,reelsLoadedAt:0};')
    replace(rel,'connectState.reelsLoaded=true;',
        'connectState.reelsLoaded=true;connectState.reelsLoadedAt=Date.now();')
    replace(rel,
        "function recoverVisibleSocial(){if(!state.user||document.hidden||navigator.onLine===false)return;clearTimeout(socialRecoveryTimer);socialRecoveryTimer=setTimeout(()=>{void loadFeed(true);if(connectState.reelsLoaded)void loadReels()},280)}",
        "function recoverVisibleSocial(){if(!state.user||document.hidden||navigator.onLine===false)return;clearTimeout(socialRecoveryTimer);const refreshReels=connectState.reelsLoaded&&Date.now()-connectState.reelsLoadedAt>120000;socialRecoveryTimer=setTimeout(()=>{void loadFeed(true);if(refreshReels)void loadReels()},280)}")
    replace(rel,
        'connectState.reelLoadObserver.observe(panel);\n}',
        "connectState.reelLoadObserver.observe(panel);\n const warm=()=>{if(state.user&&!connectState.reelsLoaded&&!connectState.reelsLoading&&navigator.onLine!==false&&!(navigator.connection&&navigator.connection.saveData))void loadReels()};\n if('requestIdleCallback' in window)requestIdleCallback(warm,{timeout:2200});else setTimeout(warm,1400);\n}")

# Give a slow stream more time before showing retry, and clear the timer as soon as
# bytes or playback progress arrive.
replace('app/src/main/assets/reels433.js','},8000);','},15000);')
replace('app/src/main/assets/reels433.js',
    "['playing','canplay','loadeddata','pause','error','emptied'].forEach(function(name){video.addEventListener(name,clear,{passive:true});});",
    "['playing','canplay','loadeddata','loadedmetadata','progress','timeupdate','pause','error','emptied'].forEach(function(name){video.addEventListener(name,clear,{passive:true});});")

# Keep the prior 4.33 regression meaningful after the new slow-stream threshold.
replace('app/src/androidTest/java/com/marketmarney/mobile/Reels433LayoutTest.java',
        'assertTrue(script.contains("8000"));','assertTrue(script.contains("15000"));')

shutil.copy2(base/'perf434.css',root/'app/src/main/assets/perf434.css')
test_target=root/'app/src/androidTest/java/com/marketmarney/mobile/Optimization434Test.java'
test_target.parent.mkdir(parents=True,exist_ok=True)
shutil.copy2(base/'Optimization434Test.java',test_target)
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
    'app/src/main/assets/perf434.css',
    'app/src/main/assets/social411/app.js',
    'app/src/main/assets/social411/bundle427.js',
    'app/src/main/assets/social411/5eab9da17fe2c659.js',
    'app/src/androidTest/java/com/marketmarney/mobile/Reels433LayoutTest.java',
    'app/src/androidTest/java/com/marketmarney/mobile/Optimization434Test.java',
}
expected.update(version_tests)
assert changed==sorted(expected),{
    'unexpected':sorted(set(changed)-expected),
    'missing':sorted(expected-set(changed)),
}
manifest={
    'release':'4.34.0-beta',
    'package':'com.marketmarney.mobile.beta434',
    'purpose':'Bound Reels to a smart three-video buffer, preserve useful buffers across quick navigation, preload the predicted next Reel, reduce unnecessary Social reloads, and skip rendering off-screen feed cards.',
    'changed':[{'path':rel,'beforeSha256':before.get(rel),'afterSha256':after.get(rel)} for rel in changed],
    'preserved':{rel:sha for rel,sha in sorted(before.items()) if rel not in changed},
}
Path('verified434.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(f"Verified 4.34 optimization patch: {len(changed)} changed files; {len(manifest['preserved'])} unchanged files.")
