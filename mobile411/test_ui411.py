from pathlib import Path
from zipfile import ZipFile
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
import json,time,statistics,shutil
ROOT=Path.cwd();A=ROOT/'android43/app/src/main/assets';O=ROOT/'quality411';O.mkdir(exist_ok=True)
D=json.loads((ROOT/'public49/sources.json').read_text());MAP=json.loads((A/'resources49-map.json').read_text());checks=[];errors=[];requests=[]
ART=[{'id':str(i),'title':('Emas XAU/USD' if i%2==0 else 'Bitcoin BTC')+' — artikel uji '+str(i),'desc':'<b>Ringkasan uji</b> membaca perubahan pasar.','category':'FOREX' if i%2==0 else 'CRYPTO','status':'published','date':'2026-11-06','img':''} for i in range(1200)]
PROFILE={'username':'uji411','displayName':'Studio Marney (uji)','avatarUrl':None,'bio':'Akun simulasi untuk pemeriksaan tampilan.','communityBadge':{},'groupOwnerBadge':{}}
def check(n,v):
 checks.append({'name':n,'passed':bool(v)});print(('PASS ' if v else 'FAIL ')+n,flush=True)
 if not v:raise AssertionError(n)
def api(p):
 if p=='/api/content':return {'articles':ART}
 if p in ['/api/community/status','/api/community/me']:return {'enabled':True,'user':{'id':'test','username':'uji411'}}
 if p=='/api/trader-profiles/me':return {'profile':PROFILE}
 if p=='/api/trader-profiles/feed':return {'items':[{'id':'testpost','username':'uji411','displayName':'Studio Marney (uji)','body':'Tampilan lebih tenang. Fokus pada berita, analisis dan percakapan komunitas. Ini konten simulasi pengujian.','createdAt':1793920000000,'comments':0,'mine':False,'photoUrl':None,'videoUrl':None}],'hasMore':False}
 if p=='/api/trader-follow/me':return {'followerCount':0,'followingCount':0,'followers':[],'following':[],'theme':'light'}
 if p=='/api/trader-connect/groups':return {'mine':[],'discover':[]}
 return {'items':[],'unread':0,'count':0,'summaries':[]}
def route(r):
 u=urlsplit(r.request.url);p=u.path;requests.append(p)
 if u.hostname!='marketmarney.com':return r.abort()
 if p.startswith('/api/'):return r.fulfill(json=api(p))
 if p in MAP:
  data=(A/MAP[p]).read_bytes();mime='text/css' if p.endswith('.css') else 'text/javascript' if p.endswith('.js') else 'text/html'
  return r.fulfill(body=data,content_type=mime)
 raw=D.get(p+('?' + u.query if u.query else ''),D.get(p))
 if raw:return r.fulfill(body=raw,content_type='text/css' if p.endswith('.css') else 'text/javascript' if p.endswith('.js') else 'text/html')
 return r.fulfill(status=404,body='not in fixture')
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=shutil.which('google-chrome') or shutil.which('chromium'),headless=True,args=['--no-sandbox'])
 try:
  for width in [360,412]:
   c=b.new_context(viewport={'width':width,'height':800});p=c.new_page();p.on('pageerror',lambda e:errors.append(str(e)));p.route('**/*',route)
   p.goto('https://marketmarney.com/beranda-trader.html');p.wait_for_selector('.mm44-social-header');p.wait_for_selector('.sh-post');p.wait_for_timeout(300)
   check(str(width)+' Social helper bundled',p.evaluate('window.__mm411BundledReady===true'))
   check(str(width)+' five Social tabs',p.locator('.mm44-nav-button').count()==5)
   check(str(width)+' no horizontal overflow',p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
   check(str(width)+' no hidden market iframe',p.locator('#mmDesk iframe[src]').count()==0)
   p.screenshot(path=str(O/f'social-{width}.png'))
   p.locator('.mm44-nav-button[aria-label=Reels]').click();p.wait_for_timeout(100)
   check(str(width)+' Reels header retained',p.locator('.mm44-nav').is_visible())
   p.locator('.mm44-nav-button[aria-label=Linimasa]').click()
   check(str(width)+' feed reopened',p.locator('.sh-post').is_visible())
   p.goto('https://marketmarney.com/__android43/news');p.wait_for_function("document.getElementById('count').textContent.includes('1200')")
   check(str(width)+' news first page bounded',p.locator('#list article').count()==12)
   p.screenshot(path=str(O/f'news-{width}.png'))
   p.evaluate("window.parseCalls=0;const original=DOMParser.prototype.parseFromString;DOMParser.prototype.parseFromString=function(...x){window.parseCalls++;return original.apply(this,x)}")
   for q in ['emas','bitcoin','emas']:
    p.locator('#search').fill(q);p.wait_for_timeout(220)
   check(str(width)+' no repeated description parsing on search',p.evaluate('parseCalls')==0)
   check(str(width)+' search results correct',p.locator('#count').inner_text()=='600 artikel')
   p.locator('#search').fill('');p.wait_for_timeout(200)
   p.locator('.featured .save').click();p.get_by_role('button',name='Disimpan',exact=True).click()
   check(str(width)+' bookmark retained',p.locator('#count').inner_text()=='1 artikel tersimpan')
   p.get_by_role('button',name='Semua',exact=True).click();p.locator('#more').click()
   check(str(width)+' pagination',p.locator('#list article').count()==24)
   p.locator('#theme').click();p.screenshot(path=str(O/f'news-light-{width}.png'))
   check(str(width)+' theme switch',p.get_attribute('html','data-theme')=='light')
   check(str(width)+' news no horizontal overflow',p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
   c.close()
  check('No JavaScript exception in fixtures',not errors)
  check('No hidden market-data request',not any(x in requests for x in ['/api/trader/market-news','/assets/ticker-frame1873.html']))
  check('No private endpoints bundled',not any(x.startswith(('/api/','/media/')) for x in MAP))
 finally:
  b.close();(O/'results.json').write_text(json.dumps({'checks':checks,'passed':sum(x['passed'] for x in checks),'failed':sum(not x['passed'] for x in checks),'errors':errors,'account_data':'synthetic','real_messages_sent':False},indent=2))
