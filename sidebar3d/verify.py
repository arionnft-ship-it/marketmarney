from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
import os,json,datetime,subprocess,urllib.request,urllib.error
OUT=Path(os.environ.get('SIDEBAR_OUT','sidebar3d-results'));OUT.mkdir(exist_ok=True)
PUBLIC=os.environ.get('SIDEBAR_PUBLIC')=='1'
BASE='https://marketmarney.com'
out={'ok':False,'checks':[],'errors':[],'mode':'production' if PUBLIC else 'isolated-browser-overlay','scope':'Anonymous page/theme/navigation checks. No login, OTP email, public post or trading operation.'}
def ck(name,ok):
 out['checks'].append({'name':name,'ok':bool(ok)});assert ok,name
def get(path,expected=200):
 try:r=urllib.request.urlopen(urllib.request.Request(BASE+path,headers={'User-Agent':'MarketMarney-Sidebar3D-Verification','Accept-Encoding':'identity'}),timeout=25)
 except urllib.error.HTTPError as e:r=e
 b=r.read(7000000);ck(path+' HTTP',r.status==expected);return b
try:
 home=get('/').decode();ck('existing sidebar available','id="sidebar"' in home)
 if not PUBLIC:
  Path('/tmp/sidebar-home.html').write_text(home)
  patched=subprocess.check_output(['node','-e',"const fs=require('fs');process.stdout.write(require('./sidebar3d/index.cjs').enhance(fs.readFileSync('/tmp/sidebar-home.html','utf8')));"],text=True)
 else:
  patched=home;ck('deployed marker present','data-mm-sidebar3d-release="sidebar3d-20261108-v1"' in home)
  get('/assets/marney-sidebar3d-v1.css');get('/assets/marney-sidebar3d-v1.js')
 with sync_playwright() as p:
  b=p.chromium.launch(headless=True,args=['--no-sandbox'])
  def context(width=1440,height=1080,**kw):
   ctx=b.new_context(viewport={'width':width,'height':height},service_workers='block',**kw)
   if not PUBLIC:
    def route(rt):
     path=urlsplit(rt.request.url).path
     if path in ['/','/index.html'] and rt.request.resource_type=='document':rt.fulfill(status=200,content_type='text/html',body=patched)
     elif path=='/assets/marney-sidebar3d-v1.css':rt.fulfill(status=200,content_type='text/css',body=Path('sidebar3d/style.css').read_text())
     elif path=='/assets/marney-sidebar3d-v1.js':rt.fulfill(status=200,content_type='text/javascript',body=Path('sidebar3d/client.js').read_text())
     else:rt.continue_()
    ctx.route('https://marketmarney.com/**',route)
   return ctx
  ctx=context(color_scheme='dark');pg=ctx.new_page();pg.on('pageerror',lambda e:out['errors'].append(str(e)))
  pg.goto(BASE+'/',wait_until='domcontentloaded',timeout=60000)
  pg.wait_for_function('window.MMSidebar3D?.iconCount()===12',timeout=30000)
  ck('12 sculpted SVG icons loaded',pg.locator('#sidebar .mm3d-icon svg').count()==12)
  ck('light default even on dark OS',pg.locator('html').get_attribute('data-mm-theme')=='light')
  ck('original brand image retained',pg.locator('#sidebar .brand img').get_attribute('src').startswith('./assets/brand-logo'))
  ck('10 original page buttons retained',pg.locator('#nav [data-page]').count()==10)
  expected=['Beranda','Berita','Analisa','Market Live','Watchlist','Kalender Ekonomi','Jurnal Trader','Social Marney','MarketMarney TV','Utilities']
  ck('original menu order intact',pg.locator('#nav [data-page]').evaluate_all('(els)=>els.map(e=>e.dataset.page)')==expected)
  ck('WarXAU destination unchanged','/assets/xau-war-3d.html' in pg.locator('#mm-xau-war-link').get_attribute('href'))
  ck('About destination unchanged',pg.locator('.mm-about-nav-link').get_attribute('href')=='./about.html')
  ck('Instagram and TikTok destinations retained',pg.locator('#sidebar .social-link').evaluate_all('(a)=>a.map(x=>x.href)')==['https://www.instagram.com/marketmarney/','https://www.tiktok.com/@marketmarney'])
  ck('sidebar bevel shadow applied',pg.locator('#nav .navbtn').first.evaluate('e=>getComputedStyle(e).boxShadow')!='none')
  ck('embossed gradient visible', 'linear-gradient' in pg.locator('#nav .navbtn').first.evaluate('e=>getComputedStyle(e).backgroundImage'))
  ck('sidebar only one active item',pg.locator('#sidebar [aria-current=page]').count()==1)
  ck('sidebar fits its column',pg.locator('#sidebar').evaluate('e=>e.scrollWidth<=e.clientWidth+1'))
  for name in ['Berita','Analisa','Watchlist','Utilities','Beranda']:
   pg.locator('#nav [data-page="'+name+'"] .mm3d-icon').click()
   pg.wait_for_function('(name)=>document.querySelector("#nav .active")?.dataset.page===name',arg=name,timeout=10000)
   pg.wait_for_function('MMSidebar3D.iconCount()===12')
   ck(name+' icon click navigates and remains decorated',pg.locator('#nav .active').get_attribute('data-page')==name)
  pg.locator('[data-mm-theme-choice="dark"]').click();ck('dark theme still works',pg.locator('html').get_attribute('data-mm-theme')=='dark')
  ck('dark sidebar colors adapt',pg.locator('#sidebar').evaluate('e=>getComputedStyle(e).getPropertyValue("--s3-text").trim()')=='#edf0f3')
  pg.reload(wait_until='domcontentloaded');pg.wait_for_function('window.MMSidebar3D?.iconCount()===12');ck('saved dark choice persists',pg.locator('html').get_attribute('data-mm-theme')=='dark')
  pg.screenshot(path=str(OUT/'MarketMarney-Menu3D-Dark.png'),timeout=30000)
  pg.locator('[data-mm-theme-choice="light"]').click();pg.locator('#nav [data-page="Berita"]').click();pg.wait_for_function('MMSidebar3D.iconCount()===12')
  pg.wait_for_timeout(1200);pg.evaluate('window.scrollTo(0,0)');pg.locator('#sidebar').evaluate('e=>e.scrollTop=0')
  pg.screenshot(path=str(OUT/'MarketMarney-Menu3D-Desktop.png'),timeout=30000)
  pg.locator('#sidebar').screenshot(path=str(OUT/'MarketMarney-Menu3D-Sidebar.png'),timeout=30000)
  pg.locator('#nav [data-page="Beranda"]').focus();pg.keyboard.press('Enter');pg.wait_for_function('document.querySelector("#nav .active")?.dataset.page==="Beranda"')
  ck('keyboard navigation works',True)
  pg.set_viewport_size({'width':1024,'height':850});pg.wait_for_timeout(250)
  ck('compact desktop no sidebar overflow',pg.locator('#sidebar').evaluate('e=>e.scrollWidth<=e.clientWidth+1'))
  ck('compact labels stay inside rows',pg.locator('#sidebar .mm3d-label').evaluate_all('(els)=>els.every(e=>e.getBoundingClientRect().right<=e.parentElement.getBoundingClientRect().right-5)'))
  ctx.close()
  ctx=context(390,844,is_mobile=True,has_touch=True);pg=ctx.new_page();pg.on('pageerror',lambda e:out['errors'].append(str(e)))
  pg.goto(BASE+'/',wait_until='domcontentloaded',timeout=60000);pg.wait_for_function('window.MMSidebar3D?.iconCount()===12');pg.locator('#mobileToggle').click();pg.wait_for_timeout(350)
  ck('mobile drawer opens',pg.locator('#sidebar').evaluate('e=>e.getBoundingClientRect().x>=-1'))
  ck('mobile 3D menu contained in viewport',pg.locator('#sidebar').evaluate('e=>e.getBoundingClientRect().right<=innerWidth && e.scrollWidth<=e.clientWidth+1'))
  pg.screenshot(path=str(OUT/'MarketMarney-Menu3D-Mobile.png'),timeout=30000)
  pg.locator('#nav [data-page="Analisa"] .mm3d-icon').click();pg.wait_for_timeout(350)
  ck('mobile tap closes drawer',not pg.locator('#sidebar').evaluate('e=>e.classList.contains("show")'))
  ck('mobile route changed',pg.locator('#nav .active').get_attribute('data-page')=='Analisa')
  pg.locator('#mobileToggle').click();pg.keyboard.press('Escape');pg.wait_for_timeout(350);ck('Escape closes drawer',not pg.locator('#sidebar').evaluate('e=>e.classList.contains("show")'))
  for width in [320,768]:
   pg.set_viewport_size({'width':width,'height':844});pg.wait_for_timeout(200);ck(str(width)+' no page horizontal overflow',pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
  ctx.close()
  ctx=context(reduced_motion='reduce');pg=ctx.new_page();pg.goto(BASE+'/',wait_until='domcontentloaded',timeout=60000);pg.wait_for_function('window.MMSidebar3D?.iconCount()===12');ck('reduced-motion honored',pg.locator('#nav .navbtn').first.evaluate('e=>getComputedStyle(e).transitionDuration')=='0s');ctx.close();b.close()
 ck('no browser JavaScript exceptions',not out['errors'])
 if PUBLIC:
  get('/_railway/health');account=get('/akun.html').decode();ck('account and OTP not restyled','marney-sidebar3d-v1' not in account)
  for arena in ['xau','btc','oil','nasdaq','ihsg']:
   doc=get('/assets/'+arena+'-war-3d.html').decode();ck(arena+' arena not restyled','marney-sidebar3d-v1' not in doc)
  for ep in ['arena','status','stream']:get('/api/xau-war/mt4/'+ep,401)
  ck('FBS remains private',json.loads(get('/api/xau-war/mt4/health'))['publicDisplay'] is False)
 out['ok']=True
except Exception as e:out['error']=str(e)
finally:
 out['checkedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();(OUT/'report.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out))
if not out['ok']:raise SystemExit(1)
