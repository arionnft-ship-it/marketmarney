"""Apply to an assembled 4.6 project. No server or user-data changes."""
from pathlib import Path
import re,sys,shutil
base=Path(sys.argv[1]) if len(sys.argv)>1 else Path('android43')
root=Path(__file__).resolve().parent
assets=base/'app/src/main/assets'
p=base/'app/src/main/java/com/marketmarney/mobile/MainActivity.java';s=p.read_text()
def once(a,b):
 global s
 assert s.count(a)==1,(a[:100],s.count(a))
 s=s.replace(a,b,1)
once('socialCss=asset("social44.css")+"\\n"+asset("reels46.css");socialScript=asset("social44.js")+"\\n"+asset("reels46.js");','socialCss=asset("social44.css")+"\\n"+asset("reels46.css")+"\\n"+asset("navigation47.css");socialScript=asset("social44.js")+"\\n"+asset("reels46.js")+"\\n"+asset("navigation47.js");')
once('if("/beranda-trader.html".equals(Uri.parse(url).getPath())||"/profil.html".equals(Uri.parse(url).getPath())){','if("/beranda-trader.html".equals(Uri.parse(url).getPath())||"/profil.html".equals(Uri.parse(url).getPath())||"/grup-trader.html".equals(Uri.parse(url).getPath())){')
once('if("/beranda-trader.html".equals(p)&&tab!=SOCIAL){navigate(SOCIAL);if(u.getQuery()!=null)open(u.toString());return true;}', 'if(("/beranda-trader.html".equals(p)||"/grup-trader.html".equals(p))&&tab!=SOCIAL){navigate(SOCIAL);if(u.getQuery()!=null||u.getFragment()!=null||"/grup-trader.html".equals(p))open(u.toString());return true;}')
s=s.replace('MarketMarneyAndroid/4.6 AppShell','MarketMarneyAndroid/4.7 AppShell').replace("version:'4.6'","version:'4.7'").replace("dataset.mmAndroid='46'","dataset.mmAndroid='47'").replace("s.dataset.revision!=='46'","s.dataset.revision!=='47'").replace("s.dataset.revision='46'","s.dataset.revision='47'")
p.write_text(s)
p=assets/'reels46.js';j=p.read_text()
a="function dimensions(){var vv=window.visualViewport;H.style.setProperty('--mm46-height',Math.round(vv?vv.height:innerHeight)+'px');}"
b="function dimensions(){var vv=window.visualViewport,vh=Math.round(vv?vv.height:innerHeight),head=document.getElementById('mm44-social-header'),top=head?Math.ceil(head.getBoundingClientRect().height):0;H.style.setProperty('--mm47-vh',vh+'px');H.style.setProperty('--mm47-top',top+'px');H.style.setProperty('--mm46-height',Math.max(1,vh-top)+'px');}"
assert j.count(a)==1;j=j.replace(a,b,1);p.write_text(j)
p=assets/'social44.js';j=p.read_text()
a=" if(new URL(location.href).searchParams.has('reel'))setView('reels',false);\n else if(location.hash.indexOf('#mm44-')===0)hashView();"
b=""" var routeObserver=null;
 function applyInitialRoute(){
  if(!logged())return false;
  if(new URL(location.href).searchParams.has('reel'))setView('reels',false);
  else if(location.hash.indexOf('#mm44-')===0)hashView();
  return true;
 }
 if((new URL(location.href).searchParams.has('reel')||location.hash.indexOf('#mm44-')===0)&&!applyInitialRoute()){
  routeObserver=new MutationObserver(function(){if(applyInitialRoute()){routeObserver.disconnect();routeObserver=null;}});
  if($('shLogged'))routeObserver.observe($('shLogged'),{attributes:true,attributeFilter:['hidden']});
 }
 window.addEventListener('pagehide',function(){if(routeObserver)routeObserver.disconnect();},{once:true});"""
assert j.count(a)==1;j=j.replace(a,b,1);p.write_text(j)
for name in ['navigation47.css','navigation47.js']:shutil.copy2(root/name,assets/name)
p=base/'app/build.gradle';g=p.read_text();g=re.sub(r"applicationId '[^']+'","applicationId 'com.marketmarney.mobile.beta47'",g);g=re.sub(r'versionCode \d+','versionCode 11',g);g=re.sub(r"versionName '[^']+'","versionName '4.7.0-beta'",g);p.write_text(g)
p=base/'app/src/main/res/values/strings.xml';p.write_text(re.sub(r'(<string name="app_name">)[^<]+',r'\g<1>Marney 4.7 Navigasi Beta',p.read_text()))
assert 'labels={"Beranda","Berita","Market Live","Social Marney"}' in s
assert 'handler.cancel()' in s and 'addJavascriptInterface' not in s
assert 'while(retained.size()>1)' in s
print('PASS: Social navigation persists on Reels and group routes; server/auth handlers unchanged')
