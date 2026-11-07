#!/usr/bin/env python3
"""Apply the verified Marney 4.25 light-only presentation to Android 4.24."""
from pathlib import Path
import hashlib
import json
import shutil
import sys

root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('android425')
patch = Path(__file__).resolve().parent


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def inventory(base: Path):
    return {
        path.relative_to(base).as_posix(): sha(path)
        for path in base.rglob('*') if path.is_file()
    }


def replace(relative: str, old: str, new: str, count: int = 1):
    path = root / relative
    text = path.read_text()
    actual = text.count(old)
    assert actual == count, f'{relative}: expected {count} occurrence(s), found {actual}: {old[:120]!r}'
    path.write_text(text.replace(old, new, count))


# 4.24 was reconstructed and verified immediately before this script.
required = {
    'app/build.gradle': ["applicationId 'com.marketmarney.mobile.beta424'", 'versionCode 28', "versionName '4.24.0-beta'"],
    'app/src/main/java/com/marketmarney/mobile/MainActivity.java': ['MarketMarneyAndroid/4.24 AppShell', 'MMChrome424', 'DirectGallery424'],
    'app/src/main/assets/chrome424.js': ['window.MMChrome424', "return 'dark'"],
    'app/src/main/res/values/strings.xml': ['Marney 4.24'],
}
for relative, markers in required.items():
    text = (root / relative).read_text()
    for marker in markers:
        assert marker in text, f'Unexpected 4.24 base: {relative} lacks {marker!r}'

before = inventory(root)

# Release identity.
replace('app/build.gradle', "applicationId 'com.marketmarney.mobile.beta424'", "applicationId 'com.marketmarney.mobile.beta425'")
replace('app/build.gradle', 'versionCode 28', 'versionCode 29')
replace('app/build.gradle', "versionName '4.24.0-beta'", "versionName '4.25.0-beta'")
replace('app/src/main/res/values/strings.xml', '<string name="app_name">Marney 4.24</string>', '<string name="app_name">Marney 4.25 Light</string>')
replace('app/src/androidTest/java/com/marketmarney/mobile/Stability414Test.java',
        'assertTrue(r.contains("4.24.0-beta"))', 'assertTrue(r.contains("4.25.0-beta"))')

main = 'app/src/main/java/com/marketmarney/mobile/MainActivity.java'
replace(main,
        'private static final int BG=Color.rgb(9,20,32), PANEL=Color.rgb(15,33,49);',
        'private static final int BG=Color.rgb(244,246,249), PANEL=Color.rgb(255,255,255);')
replace(main,
        'private static final int GOLD=Color.rgb(255,184,77), TEXT=Color.rgb(243,246,250), MUTED=Color.rgb(161,179,198);',
        'private static final int GOLD=Color.rgb(154,101,28), TEXT=Color.rgb(23,40,59), MUTED=Color.rgb(95,112,130);')
replace(main,
        'private String socialScript="", socialCss="", brandingScript="", depthCss="", depthScript="", chromeScript="";',
        'private String socialScript="", socialCss="", brandingScript="", depthCss="", depthScript="", chromeScript="", lightCss="", lightScript="";')
replace(main, 'MarketMarney 4.24.0-beta', 'MarketMarney 4.25.0-beta')
replace(main,
'''    private boolean reelsChrome=false;
    private boolean chromeLight=false;
    private boolean lightSocial(){return chromeLight;}''',
'''    private boolean reelsChrome=false;
    private boolean chromeLight=true;
    private boolean lightSocial(){return true;}''')

replace(main,
'''        getWindow().setStatusBarColor(Color.rgb(3,10,16));getWindow().setNavigationBarColor(Color.rgb(3,10,16));
        getWindow().getDecorView().setSystemUiVisibility(0);''',
'''        getWindow().setStatusBarColor(Color.WHITE);getWindow().setNavigationBarColor(Color.WHITE);
        int lightBars=View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
        if(Build.VERSION.SDK_INT>=26)lightBars|=View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        getWindow().getDecorView().setSystemUiVisibility(lightBars);''')
replace(main,
'''        getWindow().setStatusBarColor(BG);getWindow().setNavigationBarColor(PANEL);
        getWindow().getDecorView().setSystemUiVisibility(0);''',
'''        getWindow().setStatusBarColor(Color.WHITE);getWindow().setNavigationBarColor(Color.WHITE);
        int lightBars=View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
        if(Build.VERSION.SDK_INT>=26)lightBars|=View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        getWindow().getDecorView().setSystemUiVisibility(lightBars);''')
replace(main,
        'bottom=new LinearLayout(this);bottom.setBackground(DepthStyle424.tray(this,lightSocial(),reelsChrome));bottom.setElevation(dp(2));',
        'bottom=new LinearLayout(this);bottom.setBackground(DepthStyle423.tray(this,true));bottom.setElevation(dp(2));')
replace(main,
        'depthCss=asset("depth423.css");depthScript=asset("depth423.js");chromeScript=asset("chrome424.js");',
        'depthCss=asset("depth423.css");depthScript=asset("depth423.js");chromeScript=asset("chrome424.js");lightCss=asset("light425.css");lightScript=asset("light425.js");')
replace(main,
        'iconShell.setBackground(DepthStyle424.tabPlate(this,lightSocial(),selected,reelsChrome));',
        'iconShell.setBackground(DepthStyle423.tabPlate(this,true,selected));')
replace(main,
        'NavIcon(int k,boolean a){super(MainActivity.this);kind=k;active=a;depthShader=DepthStyle424.iconShader(lightSocial(),active,reelsChrome);setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);}',
        'NavIcon(int k,boolean a){super(MainActivity.this);kind=k;active=a;depthShader=DepthStyle423.iconShader(true,active);setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);}')
replace(main,
        'tab=selected;reelsChrome=tab==SOCIAL&&cached!=null&&cached.getUrl()!=null&&cached.getUrl().endsWith("#mm44-reels");chromeLight=tab==SOCIAL&&!reelsChrome;updateSocialChrome();drawTabs();',
        'tab=selected;reelsChrome=tab==SOCIAL&&cached!=null&&cached.getUrl()!=null&&cached.getUrl().endsWith("#mm44-reels");chromeLight=true;updateSocialChrome();drawTabs();')

replace(main,
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
    }''',
'''    private void applyChromeTheme(WebView owner,boolean light){
        if(destroyed||owner!=web||!own(owner.getUrl()))return;
        if(!chromeLight){chromeLight=true;updateSocialChrome();drawTabs();}
    }
    private void updateSocialChrome(){
        chromeLight=true;
        root.setBackgroundColor(Color.WHITE);
        getWindow().setStatusBarColor(Color.WHITE);
        getWindow().setNavigationBarColor(Color.WHITE);
        int flags=View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
        if(Build.VERSION.SDK_INT>=26)flags|=View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        getWindow().getDecorView().setSystemUiVisibility(flags);
        if(bottom!=null)bottom.setBackground(DepthStyle423.tray(this,true));
    }''')

replace(main,
        'web=new WebView(this);ChromeTheme424.attach(web,(owner,light)->applyChromeTheme(owner,light));web.setBackgroundColor(lightSocial()?Color.WHITE:BG);web.setOverScrollMode(View.OVER_SCROLL_NEVER);',
        'web=new WebView(this);ChromeTheme424.attach(web,(owner,light)->applyChromeTheme(owner,true));web.setBackgroundColor(Color.WHITE);web.setOverScrollMode(View.OVER_SCROLL_NEVER);')
replace(main, 'MarketMarneyAndroid/4.24 AppShell', 'MarketMarneyAndroid/4.25 AppShell')
replace(main,
        "window.MarketMarneyApp={platform:'android',version:'4.24'};document.documentElement.dataset.mmAndroid='424';",
        "window.MarketMarneyApp={platform:'android',version:'4.25'};document.documentElement.dataset.mmAndroid='425';")
replace(main, "s.dataset.revision!=='424'", "s.dataset.revision!=='425'")
replace(main, "s.dataset.revision='424'", "s.dataset.revision='425'")

# Keep the lightweight depth layer, then apply the final light-only layer last.
main_path = root / main
main_text = main_path.read_text()
chrome_marker = 'if(window.MMChrome424)window.MMChrome424.install();})()",null);'
position = main_text.index(chrome_marker) + len(chrome_marker)
light_line = '\n        v.evaluateJavascript("(function(){if(!(\"+ready+\"))return;"+lightScript+"\\nif(window.MMLight425)window.MMLight425.install();if(!document.getElementById(\'mm425-light\')){var l=document.createElement(\'style\');l.id=\'mm425-light\';l.textContent="+JSONObject.quote(lightCss)+";document.head.appendChild(l)}else{document.getElementById(\'mm425-light\').textContent="+JSONObject.quote(lightCss)+";document.head.appendChild(document.getElementById(\'mm425-light\'))}})()",null);'
main_text = main_text[:position] + light_line + main_text[position:]
main_path.write_text(main_text)

# Native waiting and recovery surfaces are light as well.
replace(main, 'note.setBackground(DepthStyle423.panel(MainActivity.this,false));', 'note.setBackground(DepthStyle423.panel(MainActivity.this,true));')
replace(main, 'DepthStyle423.applyButton(retry,false,true);retry.setOnClickListener(v->confirmReload());', 'DepthStyle423.applyButton(retry,true,true);retry.setOnClickListener(v->confirmReload());')
replace(main, 'box.setBackground(DepthStyle423.screen(this,false));', 'box.setBackground(DepthStyle423.screen(this,true));')
replace(main, 'DepthStyle423.applyButton(retry,false,true);retry.setOnClickListener(v->recoverPage());', 'DepthStyle423.applyButton(retry,true,true);retry.setOnClickListener(v->recoverPage());')
replace(main, 'DepthStyle423.applyButton(home,false,false);home.setOnClickListener(v->navigate(tab));', 'DepthStyle423.applyButton(home,true,false);home.setOnClickListener(v->navigate(tab));')
replace(main, 'scroll.setBackground(DepthStyle423.screen(this,false));', 'scroll.setBackground(DepthStyle423.screen(this,true));')

# Local News opens light immediately and no longer exposes a theme button.
news = 'app/src/main/assets/news43.html'
replace(news, '<html lang="id">', '<html lang="id" data-theme="light" data-mm-light-only="425">')
replace(news, '<meta name="color-scheme" content="dark light">', '<meta name="color-scheme" content="light">')
replace(news, 'id="theme" aria-label="Ganti tema" title="Ganti tema"', 'id="theme" hidden aria-hidden="true" tabindex="-1" aria-label="Tema terang tetap" title="Tema terang tetap"')
replace(news,
        "try{document.documentElement.dataset.theme=localStorage.getItem('mm43-news-theme')||'dark';}catch(e){}",
        "try{document.documentElement.dataset.theme='light';localStorage.setItem('mm43-news-theme','light');}catch(e){}")
replace(news,
        "$('theme').onclick=()=>{const theme=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=theme;try{localStorage.setItem('mm43-news-theme',theme);}catch(e){}};",
        "$('theme').hidden=true;$('theme').onclick=()=>{document.documentElement.dataset.theme='light';};")

# Packaged Social, Profile and Group resources cannot restore a saved dark mode.
social_theme = 'app/src/main/assets/social411/5eab9da17fe2c659.js'
replace(social_theme, "const safe=theme==='dark'?'dark':'light',root=document.documentElement;", "const safe='light',root=document.documentElement;")
replace(social_theme, "try{applyTraderTheme(localStorage.getItem('mm1839-last-theme')==='dark'?'dark':'light',false)}catch{applyTraderTheme('light',false)}", "try{localStorage.setItem('mm1839-last-theme','light')}catch{}applyTraderTheme('light',false)")
replace('app/src/main/assets/group48/4e221ebb961158b1.js',
        "function useTheme(){try{document.documentElement.dataset.traderTheme=localStorage.getItem('mm1839-last-theme')==='dark'?'dark':'light'}catch{}}",
        "function useTheme(){try{localStorage.setItem('mm1839-last-theme','light')}catch{}document.documentElement.dataset.traderTheme='light'}")
replace('app/src/main/assets/profile49/f2df6b163f3fa272.js',
        "try{const theme=localStorage.getItem('mm1839-last-theme');if(theme==='dark')document.documentElement.dataset.traderTheme='dark'}catch{}",
        "try{localStorage.setItem('mm1839-last-theme','light')}catch{}document.documentElement.dataset.traderTheme='light'")
replace('app/src/main/assets/social43.js',
        " menuAction('Ganti tema terang / gelap',function(){var mode=html.dataset.traderTheme==='dark'?'light':'dark';var btn=document.querySelector('[data-sh-theme=\"'+mode+'\"]');if(btn)btn.click();});",
        " html.dataset.traderTheme='light';")

# Light Android launch window on old and new Android versions.
for relative in ('app/src/main/res/values/styles.xml', 'app/src/main/res/values-v31/styles.xml'):
    path = root / relative
    text = path.read_text()
    assert '#061423' in text, f'{relative}: dark launch color not found'
    text = text.replace('#061423', '#F4F6F9')
    text = text.replace('<item name="android:windowLightStatusBar">false</item>', '<item name="android:windowLightStatusBar">true</item>')
    if 'android:windowLightNavigationBar' not in text:
        text = text.replace('<item name="android:windowLightStatusBar">true</item>',
                            '<item name="android:windowLightStatusBar">true</item>\n        <item name="android:windowLightNavigationBar">true</item>')
    path.write_text(text)

# Light opening artwork while keeping the same timing, logo and accessibility behavior.
overlay = 'app/src/main/java/com/marketmarney/mobile/StartupOverlay.java'
replace(overlay,
        'private static final int NAVY=0xff030a10,GOLD=0xffffb334,WHITE=0xfff7f7f4,MUTED=0xffa9b8c3;',
        'private static final int NAVY=0xfff4f6f9,GOLD=0xff9a651c,WHITE=0xff17283b,MUTED=0xff61758a;')
replace(overlay, 'track.setBackground(round(0xff1e262e,50));', 'track.setBackground(round(0xffdbe4ec,50));')
replace(overlay, 'skip=text("LEWATI  ↗",11,0xffffe2b5,true);', 'skip=text("LEWATI  ↗",11,0xff7b4e13,true);')
replace(overlay, 'GradientDrawable sb=round(0xff12181f,30);sb.setStroke(dp(1),0xff9d6d2b);', 'GradientDrawable sb=round(0xffffffff,30);sb.setStroke(dp(1),0xffc79242);')
replace(overlay,
        'base=new LinearGradient(0,0,w,h,new int[]{0xff040b12,0xff0a1a26,0xff02070d},null,Shader.TileMode.CLAMP);',
        'base=new LinearGradient(0,0,w,h,new int[]{0xffffffff,0xfff5f8fb,0xfffff8eb},null,Shader.TileMode.CLAMP);')
replace(overlay,
        'halo=new RadialGradient(w*.5f,h*.38f,w*.46f,new int[]{0x39ee9b2a,0x13d27a16,0x00ee9b2a},null,Shader.TileMode.CLAMP);',
        'halo=new RadialGradient(w*.5f,h*.38f,w*.46f,new int[]{0x40f4bd61,0x18e8a94a,0x00ffffff},null,Shader.TileMode.CLAMP);')
replace(overlay, 'p.setColor(0x1a87a6b8);', 'p.setColor(0x24758ca1);')
replace(overlay, 'p.setColor(0x33ffba52);', 'p.setColor(0x55d89a3d);')
replace(overlay, 'p.setColor(0x65ffa93b);', 'p.setColor(0x8fc6812d);')
replace(overlay, 'p.setColor(0x88ffb23e);', 'p.setColor(0x99c9822c);')

# Add the final light layer and focused tests.
new_files = {
    'app/src/main/assets/light425.css',
    'app/src/main/assets/light425.js',
    'app/src/androidTest/java/com/marketmarney/mobile/LightOnly425Test.java',
}
for relative in new_files:
    source = patch / 'overrides' / relative
    destination = root / relative
    assert source.is_file() and not destination.exists(), relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, destination)

shutil.copyfile(patch / 'Marney425-Panduan.md', root / 'README-MULAI-DISINI.md')

after = inventory(root)
changed = sorted(set(before) ^ set(after) | {p for p in set(before) & set(after) if before[p] != after[p]})
expected = {
    'README-MULAI-DISINI.md', 'app/build.gradle',
    'app/src/androidTest/java/com/marketmarney/mobile/Stability414Test.java',
    'app/src/main/java/com/marketmarney/mobile/MainActivity.java',
    'app/src/main/java/com/marketmarney/mobile/StartupOverlay.java',
    'app/src/main/res/values/strings.xml', 'app/src/main/res/values/styles.xml',
    'app/src/main/res/values-v31/styles.xml', 'app/src/main/assets/news43.html',
    'app/src/main/assets/social411/5eab9da17fe2c659.js',
    'app/src/main/assets/group48/4e221ebb961158b1.js',
    'app/src/main/assets/profile49/f2df6b163f3fa272.js',
    'app/src/main/assets/social43.js',
} | new_files
assert set(changed) == expected, {'unexpected': sorted(set(changed)-expected), 'missing': sorted(expected-set(changed))}

manifest = {
    'version': '4.25.0-beta',
    'baseVersion': '4.24.0-beta',
    'baseCommit': 'df83e0ec2476e823008d346652b110dc71221fb2',
    'purpose': 'Force one light presentation across native chrome and all trusted app pages; remove dark-theme choices while retaining direct Android gallery uploads.',
    'changed': [{'path': path, 'beforeSha256': before.get(path), 'afterSha256': after[path]} for path in changed],
    'preserved': {path: digest for path, digest in sorted(before.items()) if path not in changed},
}
Path('verified425.json').write_text(json.dumps(manifest, indent=2) + '\n')
print('Verified 4.25 light-only patch:', len(changed), 'changed files;', len(manifest['preserved']), 'unchanged files.')
