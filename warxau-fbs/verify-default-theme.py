from pathlib import Path
from urllib.parse import urlsplit
import os,json,datetime,urllib.request
from playwright.sync_api import sync_playwright
PUBLIC=os.environ.get('THEME_PUBLIC')=='1'
ROOT=Path('theme-fixture');OUT=Path('theme-production-results' if PUBLIC else 'theme-test-results');OUT.mkdir(exist_ok=True)
BASE='https://marketmarney.com';KEY='mm_public_theme_v1'
out={'ok':False,'release':'public-first-visit-light-20261108-v1','checks':[],'errors':[],'mode':'production' if PUBLIC else 'isolated-response-overlay','method':'Anonymous browser checks. Only browser-local theme preferences are changed; no account, order or public content writes.'}
def ck(n,v):
 out['checks'].append({'name':n,'ok':bool(v)});assert v,n
def theme(pg):return pg.evaluate('({attribute:document.documentElement.dataset.mmTheme,theme:window.MMTheme1867?.get(),saved:localStorage.getItem("mm_public_theme_v1"),scheme:document.documentElement.style.colorScheme,background:getComputedStyle(document.body).backgroundColor})')
try:
 cfg=json.loads((ROOT/'config.json').read_text()) if not PUBLIC else None
 with sync_playwright() as p:
  b=p.chromium.launch(headless=True,args=['--no-sandbox'])
  def context(scheme='dark',saved=None,mobile=False):
   ctx=b.new_context(color_scheme=scheme,viewport={'width':390,'height':844} if mobile else {'width':1440,'height':1000},service_workers='block')
   if saved is not None:ctx.add_init_script('if(window===window.top && location.origin==="https://marketmarney.com" && !sessionStorage.getItem("theme-test-seeded")){localStorage.setItem('+json.dumps(KEY)+','+json.dumps(saved)+');sessionStorage.setItem("theme-test-seeded","1");}')
   if not PUBLIC:
    def route_handler(route):
     u=urlsplit(route.request.url)
     if route.request.method!='GET':route.abort();return
     if u.netloc=='marketmarney.com' and u.path in ['/','/index.html']:route.fulfill(status=200,content_type='text/html; charset=utf-8',body=(ROOT/'fixture-home.html').read_bytes())
     elif u.netloc=='marketmarney.com' and u.path in [cfg['url'],'/assets/public-theme1867.js']:route.fulfill(status=200,content_type='text/javascript; charset=utf-8',body=(ROOT/'theme-patched.js').read_bytes())
     else:route.continue_()
    ctx.route('https://marketmarney.com/**',route_handler)
   return ctx
  for name,os_scheme,saved,expected in [('new-dark-OS','dark',None,'light'),('new-light-OS','light',None,'light'),('existing-dark','light','dark','dark'),('existing-light','dark','light','light'),('invalid-choice','dark','not-a-theme','light')]:
   ctx=context(os_scheme,saved);pg=ctx.new_page();pg.on('pageerror',lambda e:out['errors'].append(str(e)))
   pg.goto(BASE+'/',wait_until='domcontentloaded',timeout=60000);pg.wait_for_function('window.MMTheme1867 && document.querySelector("#mmThemeSwitch")',timeout=20000)
   s=theme(pg);ck(name+' selected correctly',s['attribute']==expected and s['theme']==expected and s['scheme']==expected)
   ck(name+' does not overwrite saved choice',s['saved']==saved)
   ck(name+' button synchronized',pg.locator('[data-mm-theme-choice="'+expected+'"]').get_attribute('aria-pressed')=='true')
   ck(name+' first-visit marker present',pg.locator('#mm-first-visit-theme').count()==1)
   if name=='new-dark-OS':
    ck('initial page background is light',s['background']=='rgb(245, 247, 251)')
    pg.screenshot(path=str(OUT/'MarketMarney-Default-Light-Desktop.png'),timeout=30000)
    pg.locator('[data-mm-theme-choice="dark"]').click();ck('switch to dark saves choice',theme(pg)['theme']=='dark' and theme(pg)['saved']=='dark')
    pg.reload(wait_until='domcontentloaded',timeout=60000);pg.wait_for_function('window.MMTheme1867');ck('reload keeps dark',theme(pg)['theme']=='dark')
    pg.locator('[data-mm-theme-choice="light"]').click();ck('switch back to light saves choice',theme(pg)['theme']=='light' and theme(pg)['saved']=='light')
    btn=pg.locator('.navbtn[data-page="Berita"]');btn.click();ck('news navigation stays light',theme(pg)['theme']=='light')
    pg.reload(wait_until='domcontentloaded',timeout=60000);pg.wait_for_function('window.MMTheme1867');ck('reload keeps light',theme(pg)['theme']=='light')
   ctx.close()
  ctx=context('dark',None,True);pg=ctx.new_page();pg.on('pageerror',lambda e:out['errors'].append(str(e)))
  pg.goto(BASE+'/',wait_until='domcontentloaded',timeout=60000);pg.wait_for_function('window.MMTheme1867');ck('mobile new visitor light',theme(pg)['theme']=='light')
  pg.screenshot(path=str(OUT/'MarketMarney-Default-Light-Mobile.png'),timeout=30000);ctx.close();b.close()
 ck('no browser JavaScript exceptions',not out['errors'])
 if PUBLIC:
  for path,expected in [('/_railway/health',200),('/assets/news-war-performance-version.json',200),('/akun.html',200),('/api/nasdaq-war/status',200),('/api/ihsg-war/status',200),('/api/xau-war/mt4/health',200),('/api/xau-war/mt4/arena',401),('/api/xau-war/mt4/status',401)]:
   import urllib.error
   try:r=urllib.request.urlopen(BASE+path,timeout=20)
   except urllib.error.HTTPError as e:r=e
   body=r.read(5000000);ck(path+' HTTP',r.status==expected)
   if path=='/akun.html':ck('account page unaffected by public theme policy',b'mm-first-visit-theme' not in body)
   if path=='/api/xau-war/mt4/health':ck('FBS remains private',json.loads(body)['publicDisplay'] is False)
  with urllib.request.urlopen(BASE+'/assets/public-theme1867.js',timeout=20) as r:
   ck('legacy theme endpoint updated',out['release'] in r.read().decode() and 'max-age=0' in r.headers.get('Cache-Control',''))
 out['ok']=True
except Exception as e:out['error']=str(e)
finally:
 out['checkedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();(OUT/'browser.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out))
if not out['ok']:raise SystemExit(1)
