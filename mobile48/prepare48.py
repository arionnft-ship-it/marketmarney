"""App-only fast-group package. Run after 4.7 assembly. No live writes."""
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.parse import urlsplit,urljoin
from concurrent.futures import ThreadPoolExecutor
import re,sys,json,hashlib,time
from patch_runtime import patch_runtime
BASE='https://marketmarney.com'
base=Path(sys.argv[1]) if len(sys.argv)>1 else Path('android43')
assets=base/'app/src/main/assets';out=assets/'group48';out.mkdir(parents=True,exist_ok=True)
baseline=Path('baseline48');baseline.mkdir(exist_ok=True)
manifest={};measures=[]
def fetch(path):
 u=urlsplit(path)
 if u.scheme or u.netloc or not path.startswith('/') or '..' in u.path:raise ValueError('Unsafe path')
 start=time.monotonic()
 with urlopen(Request(BASE+path,headers={'User-Agent':'MarneyPublicBundle/4.8'}),timeout=25) as r:
  if r.status!=200 or urlsplit(r.url).netloc!='marketmarney.com':raise RuntimeError('Unexpected public response')
  data=r.read(1000001)
  if len(data)>1000000:raise RuntimeError('Asset too large')
 measures.append({'path':path,'bytes':len(data),'ms':round((time.monotonic()-start)*1000),'sha256':hashlib.sha256(data).hexdigest()})
 return data.decode('utf-8')
html=fetch('/grup-trader.html')
assert re.search(r'id="gmMessages"[^>]*>\s*</div>',html),'Do not bundle rendered private messages'
assert re.search(r'id="gmApp"[^>]*\bhidden\b',html),'Expected signed-out public shell'
original_paths=sorted(set(re.findall(r'(?:href|src)="(/assets/[^"<>]+?\.(?:js|css)(?:\?[^"<>]*)?)"',html)))
assert 1<=len(original_paths)<=35
with ThreadPoolExecutor(max_workers=4) as pool:texts=dict(zip(original_paths,pool.map(fetch,original_paths)))
raw={};runtime_path=None
for path,text in texts.items():
 plain=urlsplit(path).path;raw[plain]=text
 if plain.endswith('/trader-groups-1845.js'):runtime_path=plain
assert runtime_path,'Reviewed group runtime is missing'
expected='ce9066183b63b08e864a4bad07693ee51c3dc02ffedbd77560b36c89c67b046d'
actual=hashlib.sha256(raw[runtime_path].encode()).hexdigest()
if actual!=expected:
 (baseline/'unexpected-runtime.js').write_text(raw[runtime_path]);raise RuntimeError('Live group runtime differs from reviewed source: '+actual)
(baseline/'group.html').write_text(html)
(baseline/'assets.json').write_text(json.dumps(raw))
optimized=patch_runtime(raw[runtime_path])
(baseline/'runtime-before.js').write_text(raw[runtime_path]);(baseline/'runtime-after.js').write_text(optimized)
# Preserve stylesheet relative resource bases after the stylesheet moves inside APK.
def rewrite_css(text,source):
 def sub(m):
  value=m.group(2)
  if value.startswith(('data:','blob:','#','https:','http:','//','/')):return m.group(0)
  target=urljoin(source,value)
  return 'url("'+target+'")'
 return re.sub(r'url\(\s*([\"\']?)([^\"\')\s]+)\1\s*\)',sub,text)
for path,text in texts.items():
 plain=urlsplit(path).path;ext='.js' if plain.endswith('.js') else '.css'
 name=hashlib.sha256(path.encode()).hexdigest()[:16]+ext
 virtual='/__android48/group/'+name
 if plain==runtime_path:text=optimized
 if ext=='.css':text=rewrite_css(text,plain)
 (out/name).write_text(text);manifest[virtual]='group48/'+name
 html=html.replace('"'+path+'"','"'+virtual+'"')
# Draw the established navigation with the page rather than waiting for finish callbacks.
(out/'navigation.js').write_text((assets/'navigation47.js').read_text())
(out/'navigation.css').write_text((assets/'social44.css').read_text()+'\n'+(assets/'navigation47.css').read_text())
manifest['/__android48/group/navigation.js']='group48/navigation.js'
manifest['/__android48/group/navigation.css']='group48/navigation.css'
html=html.replace('</head>','<link rel="stylesheet" href="/__android48/group/navigation.css"><script defer src="/__android48/group/navigation.js"></script></head>')
(out/'page.html').write_text(html);manifest['/grup-trader.html']='group48/page.html'
(assets/'group48-map.json').write_text(json.dumps(manifest))
(baseline/'bundle-report.json').write_text(json.dumps({'public_assets_bundled':len(original_paths),'private_api_cache':False,'measurements':measures},indent=2))
p=base/'app/src/main/java/com/marketmarney/mobile/MainActivity.java';s=p.read_text()
def once(a,b):
 global s
 if s.count(a)!=1:raise RuntimeError('Android anchor changed: '+a[:100])
 s=s.replace(a,b,1)
once('    private String socialScript="", socialCss="";', '''    private String socialScript="", socialCss="";
    private final Map<String,String> group48Files=new HashMap<>();
    private void initGroup48(){
        try{JSONObject files=new JSONObject(asset("group48-map.json"));java.util.Iterator<String> keys=files.keys();
            while(keys.hasNext()){String key=keys.next(),file=files.getString(key);
                if(("/grup-trader.html".equals(key)||key.startsWith("/__android48/group/"))&&file.startsWith("group48/")&&!file.contains(".."))group48Files.put(key,file);
            }
        }catch(Exception ignored){group48Files.clear();}
    }
    private WebResourceResponse group48Resource(Uri u){
        String file=group48Files.get(u.getPath());if(file==null)return null;
        try{
            String mime=file.endsWith(".css")?"text/css":file.endsWith(".js")?"text/javascript":"text/html";
            WebResourceResponse r=new WebResourceResponse(mime,"UTF-8",getAssets().open(file));
            Map<String,String> h=new HashMap<>();h.put("Cache-Control","no-store");h.put("X-Content-Type-Options","nosniff");
            if(file.endsWith(".html"))h.put("Content-Security-Policy","default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; connect-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self' https://fonts.gstatic.com; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'self'");
            r.setResponseHeaders(h);return r;
        }catch(Exception ignored){return null;}
    }''')
once('        google=new AndroidGoogleLogin(', '        initGroup48();\n        google=new AndroidGoogleLogin(')
once('                Uri u=req.getUrl();\n                if(own(u)&&NEWS_PATH', '                Uri u=req.getUrl();\n                if(own(u)&&"GET".equals(req.getMethod())){WebResourceResponse local=group48Resource(u);if(local!=null)return local;}\n                if(own(u)&&NEWS_PATH')
s=s.replace('MarketMarneyAndroid/4.7 AppShell','MarketMarneyAndroid/4.8 AppShell').replace("version:'4.7'","version:'4.8'").replace("dataset.mmAndroid='47'","dataset.mmAndroid='48'").replace("s.dataset.revision!=='47'","s.dataset.revision!=='48'").replace("s.dataset.revision='47'","s.dataset.revision='48'")
p.write_text(s)
p=base/'app/build.gradle';g=p.read_text();g=re.sub(r"applicationId '[^']+'","applicationId 'com.marketmarney.mobile.beta48'",g);g=re.sub(r'versionCode \d+','versionCode 12',g);g=re.sub(r"versionName '[^']+'","versionName '4.8.0-beta'",g);p.write_text(g)
p=base/'app/src/main/res/values/strings.xml';p.write_text(re.sub(r'(<string name="app_name">)[^<]+',r'\g<1>Marney 4.8 Fast Groups',p.read_text()))
assert all(not k.startswith('/api/') for k in manifest)
assert 'handler.cancel()' in s and 'addJavascriptInterface' not in s
assert 'while(retained.size()>1)' in s
assert 'labels={"Beranda","Berita","Market Live","Social Marney"}' in s
print('PASS: bundled',len(original_paths),'public assets; auth/messages stay fresh network reads; approved layout unchanged')
