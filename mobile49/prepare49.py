"""Patch pinned assembled beta48 only. Public static profile assets supplied by read-only source artifact."""
from pathlib import Path
from urllib.parse import urlsplit,urljoin
import re,json,shutil,hashlib,sys
base=Path(sys.argv[1]) if len(sys.argv)>1 else Path('android43')
root=Path(__file__).resolve().parent
source=Path(sys.argv[2]) if len(sys.argv)>2 else Path('public49/sources.json')
public=json.loads(source.read_text())
assets=base/'app/src/main/assets';java=base/'app/src/main/java/com/marketmarney/mobile'
main=java/'MainActivity.java';s=main.read_text()
a=s.index('    private final Map<String,String> group48Files=');b=s.index('    private boolean destroyed=false;',a)
s=s[:a]+'    private AppResources49 appResources;\n'+s[b:]
def once(a,b):
 global s
 if s.count(a)!=1:raise RuntimeError('Unexpected source anchor: '+a[:120])
 s=s.replace(a,b,1)
once('        initGroup48();','        appResources=AppResources49.install(getApplicationContext());')
once('if(own(u)&&"GET".equals(req.getMethod())){WebResourceResponse local=group48Resource(u);if(local!=null)return local;}', 'if(appResources!=null){WebResourceResponse local=appResources.respond(req,"view");if(local!=null)return local;}')
once('socialScript=asset("social44.js")', 'socialScript=asset("profile49.js")+"\\n"+asset("social44.js")')
s=s.replace('MarketMarneyAndroid/4.8 AppShell','MarketMarneyAndroid/4.9 AppShell').replace("version:'4.8'","version:'4.9'").replace("dataset.mmAndroid='48'","dataset.mmAndroid='49'").replace("s.dataset.revision!=='48'","s.dataset.revision!=='49'").replace("s.dataset.revision='48'","s.dataset.revision='49'")
main.write_text(s)
r=(root/'AppResources49.java').read_text()
r=r.replace('if(file.endsWith(".html"))h.put(', 'if(file.equals("news43.html"))h.put("Content-Security-Policy","default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; connect-src \'self\'; img-src https: data:; base-uri \'none\'; form-action \'none\'");\n            else if(file.endsWith(".html"))h.put(')
(java/'AppResources49.java').write_text(r);shutil.copy2(root/'profile49.js',assets/'profile49.js')
p=assets/'social44.js';j=p.read_text()
a="if(t[0]==='profile'){if(!logged()){login();return;}var a=$('shPublicProfile');location.href=a&&safeLink(a.href)?a.href:'/akun.html?pengaturan=1';}"
b="if(t[0]==='profile'){if(window.MarneyProfile49){window.MarneyProfile49.open(b);return;}if(!logged()){login();return;}var a=$('shPublicProfile');location.href=a&&safeLink(a.href)?a.href:'/akun.html?pengaturan=1';}"
assert j.count(a)==1;j=j.replace(a,b,1);p.write_text(j)
p=assets/'navigation47.js';j=p.read_text()
a="if(a[0]==='Pesan'){link.setAttribute('aria-current','page');link.setAttribute('aria-pressed','true');}nav.append(link);"
b="if(a[0]==='Pesan'){link.setAttribute('aria-current','page');link.setAttribute('aria-pressed','true');}if(a[0]==='Profil')link.addEventListener('click',function(e){if(window.MarneyProfile49){e.preventDefault();window.MarneyProfile49.open(link);}});nav.append(link);"
assert j.count(a)==1;j=j.replace(a,b,1);p.write_text(j);(assets/'group48/navigation.js').write_text(j)
(assets/'group48/profile49.js').write_text((assets/'profile49.js').read_text())
p=assets/'group48/page.html';html=p.read_text();html=html.replace('<script defer src="/__android48/group/navigation.js">','<script defer src="/__android48/group/profile49.js"></script><script defer src="/__android48/group/navigation.js">');p.write_text(html)
manifest=json.loads((assets/'group48-map.json').read_text());manifest['/__android48/group/profile49.js']='group48/profile49.js';manifest['/__android43/news']='news43.html'
out=assets/'profile49';out.mkdir(exist_ok=True);html=public['/profil.html']
assert re.search(r'id="mm36PublicPosts"[^>]*>\s*</div>',html)
paths=sorted(set(re.findall(r'(?:href|src)="(/assets/[^"<>]+?\.(?:js|css)(?:\?[^"<>]*)?)"',html)))
for path in paths:
 text=public[path];plain=urlsplit(path).path;ext='.js' if plain.endswith('.js') else '.css';name=hashlib.sha256(path.encode()).hexdigest()[:16]+ext
 if ext=='.css':
  def rewrite(m):
   value=m.group(2)
   return m.group(0) if value.startswith(('data:','blob:','#','https:','http:','//','/')) else 'url("'+urljoin(plain,value)+'")'
  text=re.sub(r'url\(\s*([\"\']?)([^\"\')\s]+)\1\s*\)',rewrite,text)
 (out/name).write_text(text);virtual='/__android49/profile/'+name;manifest[virtual]='profile49/'+name;html=html.replace('"'+path+'"','"'+virtual+'"')
css='\n'.join((assets/n).read_text() for n in ['social44.css','reels46.css','navigation47.css'])
(out/'app.css').write_text(css);manifest['/__android49/profile/app.css']='profile49/app.css'
html=html.replace('</head>','<link rel="stylesheet" href="/__android49/profile/app.css"></head>')
(out/'page.html').write_text(html);manifest['/profil.html']='profile49/page.html'
(assets/'resources49-map.json').write_text(json.dumps(manifest,indent=2))
assert not any(k.startswith('/api/') for k in manifest)
assert 'handler.cancel()' in s and 'MIXED_CONTENT_NEVER_ALLOW' in s and 'addJavascriptInterface' not in s
p=base/'app/build.gradle';g=p.read_text();g=re.sub(r"applicationId '[^']+'","applicationId 'com.marketmarney.mobile.beta49'",g);g=re.sub(r'versionCode \d+','versionCode 13',g);g=re.sub(r"versionName '[^']+'","versionName '4.9.0-beta'",g);p.write_text(g)
p=base/'app/src/main/res/values/strings.xml';p.write_text(re.sub(r'(<string name="app_name">)[^<]+',r'\g<1>Marney 4.9 Perbaikan',p.read_text()))
print('PASS: common WebView/worker resolver; no private API caching;',len(paths),'public profile assets bundled')
