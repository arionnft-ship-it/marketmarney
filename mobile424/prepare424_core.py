#!/usr/bin/env python3
# Apply adaptive native chrome and direct media-gallery behavior to verified Android 4.23.
from pathlib import Path
import hashlib
import json
import shutil
import sys

root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("android424")
patch = Path(__file__).resolve().parent

BEFORE = {
    "README-MULAI-DISINI.md": "3bd271ee146a030be0a0bdc4c363738f6d5cc015b1fbafd2f2e98f56921cda38",
    "app/build.gradle": "7d201ed783789b4c0c3d2fceba8df634a163f878d6945b175d94e415168ab5fc",
    "app/src/androidTest/java/com/marketmarney/mobile/Stability414Test.java": "4b642097c6a7a4cae5fc3825097ca9637902185b82769449c5ed7e9a2d005dee",
    "app/src/main/java/com/marketmarney/mobile/MainActivity.java": "8dfc6daa2cf5fa91a8a927413d45e0c36524c0fb044013855ff98c312a40df8d",
    "app/src/main/res/values/strings.xml": "4aebe32f5a726924208c6813aaf861868283a387d13719d08a18a05ec046fe50",
}

NEW_FILES = {
    "app/src/main/java/com/marketmarney/mobile/ChromeTheme424.java",
    "app/src/main/java/com/marketmarney/mobile/DirectGallery424.java",
    "app/src/main/java/com/marketmarney/mobile/DepthStyle424.java",
    "app/src/main/assets/chrome424.js",
    "app/src/androidTest/java/com/marketmarney/mobile/ChromeGallery424Test.java",
}

def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def inventory(base: Path):
    return {
        path.relative_to(base).as_posix(): sha(path)
        for path in base.rglob("*")
        if path.is_file()
    }

def replace(relative: str, old: str, new: str, count: int = 1):
    path = root / relative
    text = path.read_text()
    actual = text.count(old)
    assert actual == count, f"{relative}: expected {count} occurrence(s), found {actual}: {old[:100]!r}"
    path.write_text(text.replace(old, new, count))

for relative, digest in BEFORE.items():
    path = root / relative
    assert path.is_file(), relative
    assert sha(path) == digest, f"Unexpected 4.23 base for {relative}"

for relative in NEW_FILES:
    assert not (root / relative).exists(), relative

before = inventory(root)

# Version and package.
replace("app/build.gradle", "applicationId 'com.marketmarney.mobile.beta423'",
        "applicationId 'com.marketmarney.mobile.beta424'")
replace("app/build.gradle", "versionCode 27", "versionCode 28")
replace("app/build.gradle", "versionName '4.23.0-beta'", "versionName '4.24.0-beta'")
replace("app/src/main/res/values/strings.xml", "<string name=\"app_name\">Marney 4.23</string>",
        "<string name=\"app_name\">Marney 4.24</string>")
replace("app/src/androidTest/java/com/marketmarney/mobile/Stability414Test.java",
        'assertTrue(r.contains("4.23.0-beta"))',
        'assertTrue(r.contains("4.24.0-beta"))')

main = "app/src/main/java/com/marketmarney/mobile/MainActivity.java"

replace(main,
'''    private void resumePage(WebView v){
        v.setVisibility(View.VISIBLE);v.onResume();
        if(own(v.getUrl()))v.evaluateJavascript("try{window.__mm45Suspended=false;window.dispatchEvent(new Event('mm45:resume'))}catch(e){}",null);
    }''',
'''    private void resumePage(WebView v){
        v.setVisibility(View.VISIBLE);v.onResume();
        if(own(v.getUrl())){
            v.evaluateJavascript("try{window.__mm45Suspended=false;window.dispatchEvent(new Event('mm45:resume'))}catch(e){}",null);
            v.evaluateJavascript("try{window.MMChrome424&&window.MMChrome424.sync(true)}catch(e){}",null);
        }
    }''')

replace(main,
'''        GalleryPicker415.Selection choice=new GalleryPicker415.Selection(params.getAcceptTypes(),params.getMode(),params.isCaptureEnabled());''',
'''        String[] accepted=DirectGallery424.acceptTypes(source.getUrl(),params.getAcceptTypes());
        boolean directGallery=DirectGallery424.direct(source.getUrl(),accepted);
        GalleryPicker415.Selection choice=new GalleryPicker415.Selection(accepted,params.getMode(),directGallery?false:params.isCaptureEnabled());''')

replace(main,
'''    private String socialScript="", socialCss="", brandingScript="", depthCss="", depthScript="";''',
'''    private String socialScript="", socialCss="", brandingScript="", depthCss="", depthScript="", chromeScript="";''')

replace(main, "MarketMarney 4.23.0-beta", "MarketMarney 4.24.0-beta")

replace(main,
'''    private boolean reelsChrome=false;
    private boolean lightSocial(){return tab==SOCIAL&&!reelsChrome;}''',
'''    private boolean reelsChrome=false;
    private boolean chromeLight=false;
    private boolean lightSocial(){return chromeLight;}''')

replace(main,
'''bottom=new LinearLayout(this);bottom.setBackground(DepthStyle423.tray(this,lightSocial()));bottom.setElevation(dp(2));''',
'''bottom=new LinearLayout(this);bottom.setBackground(DepthStyle424.tray(this,lightSocial(),reelsChrome));bottom.setElevation(dp(2));''')

replace(main,
'''        depthCss=asset("depth423.css");depthScript=asset("depth423.js");''',
'''        depthCss=asset("depth423.css");depthScript=asset("depth423.js");chromeScript=asset("chrome424.js");''')

replace(main,
'''            iconShell.setBackground(DepthStyle423.tabPlate(this,lightSocial(),selected));''',
'''            iconShell.setBackground(DepthStyle424.tabPlate(this,lightSocial(),selected,reelsChrome));''')

replace(main,
'''        NavIcon(int k,boolean a){super(MainActivity.this);kind=k;active=a;depthShader=DepthStyle423.iconShader(lightSocial(),active);setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);}''',
'''        NavIcon(int k,boolean a){super(MainActivity.this);kind=k;active=a;depthShader=DepthStyle424.iconShader(lightSocial(),active,reelsChrome);setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);}''')

replace(main,
'''        tab=selected;reelsChrome=tab==SOCIAL&&cached!=null&&cached.getUrl()!=null&&cached.getUrl().endsWith("#mm44-reels");updateSocialChrome();drawTabs();''',
'''        tab=selected;reelsChrome=tab==SOCIAL&&cached!=null&&cached.getUrl()!=null&&cached.getUrl().endsWith("#mm44-reels");chromeLight=tab==SOCIAL&&!reelsChrome;updateSocialChrome();drawTabs();''')

replace(main,
'''    private void updateSocialChrome(){
        boolean light=lightSocial();
        int canvas=light?Color.WHITE:BG;
        root.setBackgroundColor(canvas);
        getWindow().setStatusBarColor(canvas);
        getWindow().setNavigationBarColor(light?Color.WHITE:PANEL);
        int flags=light?View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR:0;
        if(Build.VERSION.SDK_INT>=26&&light)flags|=View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        getWindow().getDecorView().setSystemUiVisibility(flags);
        if(bottom!=null)bottom.setBackground(DepthStyle423.tray(this,light));
    }''',
'''    private void applyChromeTheme(WebView owner,boolean light){
        if(destroyed||owner!=web||!own(owner.getUrl())||chromeLight==light)return;
        chromeLight=light;updateSocialChrome();drawTabs();
    }
    private void updateSocialChrome(){
        boolean light=lightSocial();
        int canvas=reelsChrome?Color.BLACK:(light?Color.WHITE:BG);
        root.setBackgroundColor(canvas);
        getWindow().setStatusBarColor(canvas);
        getWindow().setNavigationBarColor(reelsChrome?Color.BLACK:(light?Color.WHITE:PANEL));
        int flags=light&&!reelsChrome?View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR:0;
        if(Build.VERSION.SDK_INT>=26&&light&&!reelsChrome)flags|=View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        getWindow().getDecorView().setSystemUiVisibility(flags);
        if(bottom!=null)bottom.setBackground(DepthStyle424.tray(this,light,reelsChrome));
    }''')

replace(main,
'''        web=new WebView(this);web.setBackgroundColor(lightSocial()?Color.WHITE:BG);web.setOverScrollMode(View.OVER_SCROLL_NEVER);''',
'''        web=new WebView(this);ChromeTheme424.attach(web,(owner,light)->applyChromeTheme(owner,light));web.setBackgroundColor(lightSocial()?Color.WHITE:BG);web.setOverScrollMode(View.OVER_SCROLL_NEVER);''')

replace(main,
'''        s.setUserAgentString(s.getUserAgentString()+" MarketMarneyAndroid/4.23 AppShell");''',
'''        s.setUserAgentString(s.getUserAgentString()+" MarketMarneyAndroid/4.24 AppShell");''')

replace(main,
'''            @Override public void doUpdateVisitedHistory(WebView v,String url,boolean reload){
                if(v!=web||!own(url))return;
                boolean next=tab==SOCIAL&&"mm44-reels".equals(Uri.parse(url).getFragment());
                if(next!=reelsChrome){reelsChrome=next;updateSocialChrome();drawTabs();}
            }''',
'''            @Override public void doUpdateVisitedHistory(WebView v,String url,boolean reload){
                if(v!=web||!own(url))return;
                boolean next=tab==SOCIAL&&"mm44-reels".equals(Uri.parse(url).getFragment());
                if(next!=reelsChrome){reelsChrome=next;updateSocialChrome();drawTabs();}
                v.evaluateJavascript("try{window.MMChrome424&&window.MMChrome424.sync(true)}catch(e){}",null);
            }''')

replace(main,
'''        String common="window.MarketMarneyApp={platform:'android',version:'4.23'};document.documentElement.dataset.mmAndroid='423';if(!document.getElementById('mm43-common')){var s=document.createElement('style');s.id='mm43-common';s.textContent='#mmInstall{display:none!important}';document.head.appendChild(s)}";''',
'''        String common="window.MarketMarneyApp={platform:'android',version:'4.24'};document.documentElement.dataset.mmAndroid='424';if(!document.getElementById('mm43-common')){var s=document.createElement('style');s.id='mm43-common';s.textContent='#mmInstall{display:none!important}';document.head.appendChild(s)}";''')

replace(main, "s.dataset.revision!=='423'", "s.dataset.revision!=='424'")
replace(main, "s.dataset.revision='423'", "s.dataset.revision='424'")

replace(main,
'''        v.evaluateJavascript("(function(){if(!(\"+ready+\"))return;"+depthScript+"\\nif(window.MMDepth423)window.MMDepth423.install("+JSONObject.quote(depthCss)+");})()",null);
    }''',
'''        v.evaluateJavascript("(function(){if(!(\"+ready+\"))return;"+depthScript+"\\nif(window.MMDepth423)window.MMDepth423.install("+JSONObject.quote(depthCss)+");})()",null);
        v.evaluateJavascript("(function(){if(!(\"+ready+\"))return;"+chromeScript+"\\nif(window.MMChrome424)window.MMChrome424.install();})()",null);
    }''')

# The current guide becomes the project README.
shutil.copyfile(patch / "Marney424-Panduan.md", root / "README-MULAI-DISINI.md")

# Add isolated new implementation and tests.
for relative in NEW_FILES:
    source = patch / "overrides" / relative
    destination = root / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, destination)

after = inventory(root)
changed = sorted(
    set(before) ^ set(after) |
    {path for path in set(before) & set(after) if before[path] != after[path]}
)
expected_changed = sorted(set(BEFORE) | NEW_FILES)
assert changed == expected_changed, {
    "unexpected": sorted(set(changed) - set(expected_changed)),
    "missing": sorted(set(expected_changed) - set(changed)),
}

manifest = {
    "version": "4.24.0-beta",
    "baseVersion": "4.23.0-beta",
    "baseCommit": "b77ff26d3da0de24e8acf51e5da95d28e2a0404f",
    "purpose": "Match native bottom chrome to page tone, use black chrome for Reels, and open the media gallery directly for user uploads.",
    "changed": [
        {
            "path": path,
            "beforeSha256": before.get(path),
            "afterSha256": after[path],
        }
        for path in changed
    ],
    "preserved": {
        path: digest
        for path, digest in sorted(before.items())
        if path not in changed
    },
}
Path("verified424.json").write_text(json.dumps(manifest, indent=2) + "\n")
print("Verified 4.24 adaptive chrome/gallery patch:",
      len(changed), "changed files;", len(manifest["preserved"]), "unchanged files.")
