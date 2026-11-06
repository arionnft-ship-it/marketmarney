"""Scoped premium + responsive beta. Patch the pinned 4.10 source only."""
from pathlib import Path
from urllib.parse import urlsplit,urljoin
import re,json,hashlib,sys
B=Path(sys.argv[1]) if len(sys.argv)>1 else Path('android43')
P=Path(sys.argv[2]) if len(sys.argv)>2 else Path('public49/sources.json')
ROOT=Path(__file__).resolve().parent;A=B/'app/src/main/assets';J=B/'app/src/main/java/com/marketmarney/mobile'
public=json.loads(P.read_text());skin=(ROOT/'premium411.css').read_text();news_skin=(ROOT/'news411.css').read_text()
def change(s,a,b):
 if s.count(a)!=1:raise RuntimeError('Anchor changed: '+a[:90]+' count='+str(s.count(a)))
 return s.replace(a,b,1)
# News: parse once on load, not once per article per keystroke.
p=A/'news43.html';n=p.read_text();n=change(n,'</style></head>','\n'+news_skin+'\n</style></head>')
n=change(n,"function date(a){", "const articleIndex=new WeakMap();\nfunction dataOf(a){let d=articleIndex.get(a);if(!d){const desc=plain(a.desc||a.summary),summary=desc||plain(a.body);d={time:stamp(a),category:group(a),summary:summary.slice(0,280),search:norm(a.title+' '+desc+' '+(a.cat||a.category))};articleIndex.set(a,d);}return d;}\nfunction date(a){")
n=change(n,"plain(a.desc||a.summary||a.body).slice(0,280)","dataOf(a).summary")
n=change(n,"group(a)===filter","dataOf(a).category===filter")
n=change(n,"norm(a.title+' '+plain(a.desc||a.summary)+' '+(a.cat||a.category)).includes(query)","dataOf(a).search.includes(query)")
n=change(n,"arr.slice(0,limit).forEach((a,i)=>{if(i===1)list.append(el('h2','section-title','Artikel lainnya'));list.append(article(a,i===0));});", "const batch=document.createDocumentFragment();arr.slice(0,limit).forEach((a,i)=>{if(i===1)batch.append(el('h2','section-title','Artikel lainnya'));batch.append(article(a,i===0));});list.append(batch);")
n=change(n,"$('search').addEventListener('input',()=>{query=norm($('search').value.trim());limit=12;if(!busy)render();});", "let searchTimer; $('search').addEventListener('input',()=>{query=norm($('search').value.trim());limit=12;clearTimeout(searchTimer);searchTimer=setTimeout(()=>{if(!busy)render();},110);});window.addEventListener('pagehide',()=>clearTimeout(searchTimer),{once:true});")
n=change(n,".sort((a,b)=>stamp(b)-stamp(a));$('updated')", ";all.forEach(dataOf);all.sort((a,b)=>dataOf(b).time-dataOf(a).time);$('updated')")
p.write_text(n)
# A single light skin. Group and profile CSS are already bundled.
(A/'premium411.css').write_text(skin)
for name in ['group48/navigation.css','profile49/app.css']:
 p=A/name;p.write_text(p.read_text()+'\n'+skin)
main=J/'MainActivity.java';s=main.read_text()
s=change(s,'+asset("navigation47.css");socialScript=', '+asset("navigation47.css")+"\\n"+asset("premium411.css");socialScript=')
old='NavIcon icon=new NavIcon(i,selected);cell.addView(icon,new LinearLayout.LayoutParams(dp(28),dp(26)));'
new='''FrameLayout iconShell=new FrameLayout(this);
            GradientDrawable pill=new GradientDrawable();pill.setCornerRadius(dp(13));
            pill.setColor(selected?(lightSocial()?Color.rgb(246,237,217):Color.rgb(48,44,32)):Color.TRANSPARENT);
            iconShell.setBackground(pill);
            NavIcon icon=new NavIcon(i,selected);FrameLayout.LayoutParams ip=new FrameLayout.LayoutParams(dp(26),dp(25),Gravity.CENTER);iconShell.addView(icon,ip);
            cell.addView(iconShell,new LinearLayout.LayoutParams(dp(55),dp(31)));'''
s=change(s,old,new)
s=change(s,'lineParams.topMargin=dp(4);cell.addView(line,lineParams);','lineParams.topMargin=dp(2);cell.addView(line,lineParams);')
s=s.replace('Color.rgb(20,20,20):GOLD','Color.rgb(125,87,25):GOLD')
s=s.replace('bottom.setElevation(dp(10))','bottom.setElevation(dp(2))')
s=s.replace('MarketMarneyAndroid/4.10 AppShell','MarketMarneyAndroid/4.11 AppShell').replace("version:'4.9'","version:'4.11'").replace("dataset.mmAndroid='49'","dataset.mmAndroid='411'").replace("s.dataset.revision!=='49'","s.dataset.revision!=='411'").replace("s.dataset.revision='49'","s.dataset.revision='411'")
# Avoid re-running app scripts when the bundled Social document has already mounted them.
s=change(s,'v.evaluateJavascript(css,null);v.evaluateJavascript(socialScript,null);','v.evaluateJavascript("if(!window.__mm411BundledReady){"+css+"}",null);v.evaluateJavascript("if(!window.__mm411BundledReady){"+socialScript+"}",null);')
main.write_text(s)
# Serve Social static content from APK through both known request channels.
p=J/'AppResources49.java';r=p.read_text();r=change(r,'||key.startsWith("/__android49/profile/");','||key.startsWith("/__android49/profile/")||key.equals("/beranda-trader.html")||key.startsWith("/__android411/social/");')
r=change(r,'||file.startsWith("profile49/");','||file.startsWith("profile49/")||file.startsWith("social411/");');p.write_text(r)
manifest=json.loads((A/'resources49-map.json').read_text());out=A/'social411';out.mkdir(exist_ok=True)
html=public['/beranda-trader.html'];assert 'id="shLogged" hidden' in html
# These modules initialize desktop-only widgets inside .sh-right, permanently hidden in this APK.
removed=['public-ticker1873.js','trader-market-desk.js','market-sessions1856.js','trader-workspace1857.js']
for name in removed:
 pattern=r'<script\b[^>]*src="/assets/'+re.escape(name)+r'(?:\?[^"<>]*)?"[^>]*></script>'
 html,count=re.subn(pattern,'',html);assert count==1,(name,count)
paths=sorted(set(re.findall(r'(?:src|href)="(/assets/[^"<>]+?\.(?:js|css)(?:\?[^"<>]*)?)"',html)))
for path in paths:
 text=public[path];plain=urlsplit(path).path;ext='.js' if plain.endswith('.js') else '.css';name=hashlib.sha256(path.encode()).hexdigest()[:16]+ext
 if ext=='.css':
  def rewrite(m):
   v=m.group(2)
   return m.group(0) if v.startswith(('data:','blob:','#','https:','http:','//','/')) else 'url("'+urljoin(plain,v)+'")'
  text=re.sub(r'url\(\s*([\"\']?)([^\"\')\s]+)\1\s*\)',rewrite,text)
 (out/name).write_text(text);virtual='/__android411/social/'+name;manifest[virtual]='social411/'+name;html=html.replace('"'+path+'"','"'+virtual+'"')
css='\n'.join((A/f).read_text() for f in ['social44.css','reels46.css','navigation47.css','premium411.css'])
js='\n'.join((A/f).read_text() for f in ['profile49.js','social44.js','reels46.js','navigation47.js'])+'\nwindow.__mm411BundledReady=true;'
(out/'app.css').write_text(css);(out/'app.js').write_text(js)
manifest['/__android411/social/app.css']='social411/app.css';manifest['/__android411/social/app.js']='social411/app.js'
html=change(html,'<html lang="id" data-trader-theme="light">','<html lang="id" data-trader-theme="light" data-mm44-social="1">')
html=change(html,'</head>','<link rel="stylesheet" href="/__android411/social/app.css"></head>')
html=change(html,'</body>','<script defer src="/__android411/social/app.js"></script></body>')
(out/'page.html').write_text(html);manifest['/beranda-trader.html']='social411/page.html'
(A/'resources49-map.json').write_text(json.dumps(manifest,indent=2))
assert all(not k.startswith(('/api/','/media/')) and (A/v).is_file() for k,v in manifest.items())
# Preserve session, membership, Reels playback, profile helper and startup code.
assert 'handler.cancel()' in s and 'while(retained.size()>1)' in s and 'addJavascriptInterface' not in s
p=B/'app/build.gradle';g=p.read_text();g=re.sub(r"applicationId '[^']+'","applicationId 'com.marketmarney.mobile.beta411'",g);g=re.sub(r'versionCode \d+','versionCode 15',g);g=re.sub(r"versionName '[^']+'","versionName '4.11.0-beta'",g);p.write_text(g)
p=B/'app/src/main/res/values/strings.xml';p.write_text(re.sub(r'(<string name="app_name">)[^<]+',r'\g<1>Marney 4.11 Premium',p.read_text()))
report={'social_assets_bundled':len(paths),'hidden_modules_removed':removed,'private_api_cached':False,'mapped_files':len(manifest),'base':'4.10','style':'navy/ivory/amber; no new continuous animations'}
Path('prepare411-report.json').write_text(json.dumps(report,indent=2));print(report)
