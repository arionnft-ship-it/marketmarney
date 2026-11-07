"""App-only visual polish on pinned 4.17. Preserve handlers, accounts and media policy."""
from pathlib import Path
from PIL import Image
import hashlib,json,re,sys
base=Path(sys.argv[1]) if len(sys.argv)>1 else Path('android417')
root=Path(__file__).resolve().parent
A=base/'app/src/main/assets';J=base/'app/src/main/java/com/marketmarney/mobile'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
protected={str(p.relative_to(base)):sha(p) for p in A.rglob('*') if p.is_file() and p.suffix in ('.js','.json')}
for name in ['StartupOverlay.java','AndroidGoogleLogin.java','AppResources49.java','Recovery414.java','GalleryPicker415.java']:
 p=J/name;protected[str(p.relative_to(base))]=sha(p)
original=A/'brand417/logo.png';assert sha(original)=='17570fe09d2bdca2063645e6f0b1c7929aa29930a48f6d344fa63e5c4208867e'
image=Image.open(original).convert('RGBA');original_size=image.size
sizes={original:384,base/'app/src/main/res/drawable-nodpi/mm_brand_logo.png':512,base/'app/src/main/res/mipmap-xxxhdpi/ic_launcher.png':192}
logos=[]
for p,size in sizes.items():
 before=p.stat().st_size
 image.resize((size,size),Image.Resampling.LANCZOS).save(p,optimize=True,compress_level=9)
 logos.append({'path':str(p.relative_to(base)),'beforeBytes':before,'afterBytes':p.stat().st_size,'sourceDimensions':original_size,'dimensions':[size,size],'sha256':sha(p)})
css=(root/'premium418.css').read_text();news=(root/'news418.css').read_text()
for path in ['premium411.css','social411/app.css','group48/navigation.css','profile49/app.css']:
 p=A/path;p.write_text(p.read_text()+'\n'+css)
p=A/'news43.html';s=p.read_text();scripts_before=re.findall(r'<script\b[^>]*>(.*?)</script>',s,re.S)
assert s.count('</style>')==1;s=s.replace('</style>','\n'+news+'\n</style>',1)
assert scripts_before==re.findall(r'<script\b[^>]*>(.*?)</script>',s,re.S);p.write_text(s)
p=J/'MainActivity.java';s=p.read_text()
def once(a,b):
 global s
 assert s.count(a)==1,(a[:110],s.count(a))
 s=s.replace(a,b,1)
once('BG=Color.rgb(6,15,25), PANEL=Color.rgb(13,27,40)', 'BG=Color.rgb(9,20,32), PANEL=Color.rgb(15,33,49)')
once('GOLD=Color.rgb(244,188,62), TEXT=Color.rgb(240,245,250), MUTED=Color.rgb(145,164,180)', 'GOLD=Color.rgb(239,194,122), TEXT=Color.rgb(243,246,250), MUTED=Color.rgb(161,179,198)')
once('bottom.setPadding(dp(3),dp(4),dp(3),dp(2));root.addView(bottom,new LinearLayout.LayoutParams(-1,dp(66)));','bottom.setPadding(dp(4),dp(5),dp(4),dp(3));root.addView(bottom,new LinearLayout.LayoutParams(-1,dp(70)));')
once('GradientDrawable pill=new GradientDrawable();pill.setCornerRadius(dp(13));','GradientDrawable pill=new GradientDrawable();pill.setCornerRadius(dp(15));')
once('pill.setColor(selected?(lightSocial()?Color.rgb(246,237,217):Color.rgb(48,44,32)):Color.TRANSPARENT);','pill.setColor(selected?(lightSocial()?Color.rgb(255,245,222):Color.rgb(48,46,34)):Color.TRANSPARENT);\n            pill.setStroke(dp(1),selected?(lightSocial()?Color.rgb(236,212,161):Color.rgb(109,88,51)):Color.TRANSPARENT);')
once('cell.addView(iconShell,new LinearLayout.LayoutParams(dp(55),dp(31)));','cell.addView(iconShell,new LinearLayout.LayoutParams(dp(53),dp(33)));')
once('shape.setColor(selected?(lightSocial()?Color.BLACK:GOLD):Color.TRANSPARENT);','shape.setColor(selected?(lightSocial()?Color.rgb(160,111,34):GOLD):Color.TRANSPARENT);')
once('new LinearLayout.LayoutParams(dp(22),dp(2))','new LinearLayout.LayoutParams(dp(16),dp(2))')
s=s.replace('MarketMarney 4.17.0-beta','MarketMarney 4.18.0-beta').replace('MarketMarneyAndroid/4.17','MarketMarneyAndroid/4.18').replace("version:'4.17'","version:'4.18'").replace("dataset.mmAndroid='417'","dataset.mmAndroid='418'")
s=s.replace("s.dataset.revision!=='411'","s.dataset.revision!=='418'").replace("s.dataset.revision='411'","s.dataset.revision='418'")
p.write_text(s)
p=base/'app/build.gradle';g=p.read_text();assert "applicationId 'com.marketmarney.mobile.beta417'" in g
g=g.replace("applicationId 'com.marketmarney.mobile.beta417'","applicationId 'com.marketmarney.mobile.beta418'").replace('versionCode 21','versionCode 22').replace("versionName '4.17.0-beta'","versionName '4.18.0-beta'");p.write_text(g)
p=base/'app/src/main/res/values/strings.xml';p.write_text(re.sub(r'(<string name="app_name">)[^<]+',r'\g<1>Marney 4.18 Premium',p.read_text()))
p=base/'app/src/androidTest/java/com/marketmarney/mobile/Branding417Test.java';t=p.read_text();assert t.count('17570fe09d2bdca2063645e6f0b1c7929aa29930a48f6d344fa63e5c4208867e')==1
p.write_text(t.replace('17570fe09d2bdca2063645e6f0b1c7929aa29930a48f6d344fa63e5c4208867e',sha(original)))
p=base/'app/src/androidTest/java/com/marketmarney/mobile/Stability414Test.java';p.write_text(p.read_text().replace('4.17.0-beta','4.18.0-beta'))
for rel,digest in protected.items():assert sha(base/rel)==digest,rel
assert 'while(retained.size()>1)' in s and 'if(tab==XAUWAR)return false;' in s
assert 'addJavascriptInterface' not in s and 'handler.cancel()' in s
assert 'labels={"Beranda","Berita","XAUWar","Market Live","Social Marney"}' in s
report={'preserved':protected,'logos':logos,'newsScriptsPreserved':True,'visualChangeOnly':True,'newNetworkRequests':0,'newRuntimeDependencies':0}
Path('preserved418.json').write_text(json.dumps(report,indent=2))
print('PASS:',len(protected),'JS/maps/shared code unchanged; artwork scaled intact; total logo bytes',sum(x['beforeBytes'] for x in logos),'->',sum(x['afterBytes'] for x in logos))
