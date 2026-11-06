"""Navigation-only change on the pinned Marney 4.11 source. No server/auth/data edits."""
from pathlib import Path
import hashlib,json,re,sys
base=Path(sys.argv[1]) if len(sys.argv)>1 else Path('android43')
p=base/'app/src/main/java/com/marketmarney/mobile/MainActivity.java'
s=p.read_text()
def once(a,b):
 global s
 if s.count(a)!=1:raise RuntimeError('Source anchor changed: '+a[:100])
 s=s.replace(a,b,1)
protected={str(f.relative_to(base)):hashlib.sha256(f.read_bytes()).hexdigest() for f in (base/'app/src/main/assets').rglob('*') if f.is_file()}
for name in ['StartupOverlay.java','AndroidGoogleLogin.java','AppResources49.java']:
 f=base/'app/src/main/java/com/marketmarney/mobile'/name;protected[str(f.relative_to(base))]=hashlib.sha256(f.read_bytes()).hexdigest()
once('/** Four destinations only. Web content remains inside the app. No JavaScript bridge. */','/** Five destinations. XAUWar stays inside the APK and is loaded only on selection. */')
once('    private static final int HOME=0, NEWS=1, MARKET=2, SOCIAL=3, PICK_FILE=40;', '    private static final String XAUWAR_PAGE = "/assets/xau-war-3d.html";\n    private static final String XAUWAR_PATH = XAUWAR_PAGE + "?v=7.6";\n    private static final int HOME=0, NEWS=1, XAUWAR=2, MARKET=3, SOCIAL=4, PICK_FILE=40;')
once('private final String[] labels={"Beranda","Berita","Market Live","Social Marney"};','private final String[] labels={"Beranda","Berita","XAUWar","Market Live","Social Marney"};')
once('private final String[] paths={"/index.html",NEWS_PATH,"/index.html#marketlive","/beranda-trader.html"};','private final String[] paths={"/index.html",NEWS_PATH,XAUWAR_PATH,"/index.html#marketlive","/beranda-trader.html"};')
once('    private boolean canRetain(){','''    private boolean canRetain(){
        // Never retain the 3D scene offscreen: free its WebView/GPU resources.
        if(tab==XAUWAR)return false;''')
once('navigate(Math.max(0,Math.min(3,initial)));','navigate(Math.max(0,Math.min(labels.length-1,initial)));')
once('for(int i=0;i<4;i++){','for(int i=0;i<labels.length;i++){')
once('if(selected<0||selected>3||destroyed)return;','if(selected<0||selected>=labels.length||destroyed)return;')
once('TextView title=text(labels[i],11,','TextView title=text(labels[i],10,')
once('title.setSingleLine(true);title.setGravity(Gravity.CENTER);','''title.setSingleLine(true);title.setGravity(Gravity.CENTER);
            // Five equal touch targets; fit the full Social Marney label on narrow screens.
            if(Build.VERSION.SDK_INT>=26)title.setAutoSizeTextTypeUniformWithConfiguration(9,11,1,android.util.TypedValue.COMPLEX_UNIT_SP);''')
once('            else if(kind==MARKET){','''            else if(kind==XAUWAR){q.moveTo(12,2);q.lineTo(21,6);q.lineTo(20,14);q.cubicTo(18,19,15,21,12,23);q.cubicTo(9,21,6,19,4,14);q.lineTo(3,6);q.close();c.drawPath(q,p);c.drawLine(8,8,16,16,p);c.drawLine(16,8,8,16,p);}
            else if(kind==MARKET){''')
once('                    if(NEWS_PATH.equals(p)){navigate(NEWS);return true;}','''                    if(NEWS_PATH.equals(p)){navigate(NEWS);return true;}
                    if(XAUWAR_PAGE.equals(p)&&tab!=XAUWAR){navigate(XAUWAR);if(u.getQuery()!=null||u.getFragment()!=null)open(u.toString());return true;}''')
once('web.onPause();}\n        super.onPause();','''if(tab==XAUWAR)web.setVisibility(View.GONE);web.onPause();}
        super.onPause();''')
s=s.replace('MarketMarneyAndroid/4.11 AppShell','MarketMarneyAndroid/4.12 AppShell').replace("version:'4.11'","version:'4.12'").replace("dataset.mmAndroid='411'","dataset.mmAndroid='412'")
p.write_text(s)
p=base/'app/build.gradle';g=p.read_text()
assert "applicationId 'com.marketmarney.mobile.beta411'" in g and 'versionCode 15' in g
g=g.replace("applicationId 'com.marketmarney.mobile.beta411'","applicationId 'com.marketmarney.mobile.beta412'").replace('versionCode 15','versionCode 16').replace("versionName '4.11.0-beta'","versionName '4.12.0-beta'");p.write_text(g)
p=base/'app/src/main/res/values/strings.xml';p.write_text(re.sub(r'(<string name="app_name">)[^<]+',r'\g<1>Marney 4.12 XAUWar',p.read_text()))
for rel,h in protected.items():assert hashlib.sha256((base/rel).read_bytes()).hexdigest()==h,rel
assert 'MIXED_CONTENT_NEVER_ALLOW' in s and 'handler.cancel()' in s and 'addJavascriptInterface' not in s
assert 'while(retained.size()>1)' in s and 'if(tab==XAUWAR)return false;' in s
assert 'HOME=0, NEWS=1, XAUWAR=2, MARKET=3, SOCIAL=4' in s
Path('preserved412.json').write_text(json.dumps(protected,indent=2))
print('PASS: five destinations in requested order;',len(protected),'existing files unchanged; no XAUWar preload or offscreen retention')
