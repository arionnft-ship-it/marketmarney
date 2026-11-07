from pathlib import Path
import urllib.request,urllib.error,json,datetime,hashlib
from playwright.sync_api import sync_playwright
out={'ok':False,'checks':[],'errors':[],'method':'Public HTTPS and real Kraken WebSocket; browser rendering paused for transport/layout checks. No messages, account logins or orders sent.'}
def check(n,v):
 out['checks'].append({'name':n,'ok':bool(v)});assert v,n
def get(path,expected=200):
 try:r=urllib.request.urlopen(urllib.request.Request('https://marketmarney.com'+path,headers={'Accept-Encoding':'identity','User-Agent':'MarketMarney-BTC-War-Verification'}),timeout=25)
 except urllib.error.HTTPError as e:r=e
 data=r.read(6500000);check(path+' HTTP',r.status==expected);return data
try:
 pages={p:get(p) for p in ['/_railway/health','/','/akun.html','/api/auth/android/config','/api/content','/assets/btc-war-3d.html?v=1.0','/assets/btc-war-layout.js?v=1.0','/assets/btc-war-chat.js?v=1.0','/assets/xau-war-3d.html?v=7.8','/assets/warxau-topchat.css?v=7.8','/api/xau-war/mt4/health','/api/btc-war/clock']}
 for p in ['/api/xau-war/mt4/arena','/api/xau-war/mt4/status','/api/xau-war/mt4/stream']:get(p,401)
 d=json.loads(get('/api/discussions?kind=analysis&target=MARKET%3ABITSTAMP%3ABTCUSD&sort=newest'))
 check('BTC community room available',isinstance(d.get('items'),list) and d.get('user') is None)
 d=json.loads(get('/api/discussions?kind=analysis&target=MARKET%3AOANDA%3AXAUUSD&sort=newest'));check('gold community room available',isinstance(d.get('items'),list))
 check('BTC html uses Kraken only',b'wss://ws.kraken.com/v2' in pages['/assets/btc-war-3d.html?v=1.0'] and b'api.gold-api.com' not in pages['/assets/btc-war-3d.html?v=1.0'])
 check('gold original source preserved',b'api.gold-api.com/price/XAU' in pages['/assets/xau-war-3d.html?v=7.8'])
 check('private FBS not made public',json.loads(pages['/api/xau-war/mt4/health'])['publicDisplay'] is False)
 with sync_playwright() as p:
  b=p.chromium.launch(headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  pg=b.new_page(viewport={'width':1440,'height':1000});pg.add_init_script("const r=requestAnimationFrame.bind(window);window.requestAnimationFrame=f=>f.name==='frame'?0:r(f);")
  pg.on('pageerror',lambda e:out['errors'].append(str(e)))
  pg.goto('https://marketmarney.com/assets/btc-war-3d.html?v=1.0',wait_until='load',timeout=60000)
  pg.wait_for_function('window.MM_WAR?.getSnapshot().state==="live"',polling=250,timeout=90000)
  first=pg.evaluate('MM_WAR.getSnapshot()')
  pg.wait_for_function('(t)=>MM_WAR.getSnapshot().timestamp>t',arg=first['timestamp'],polling=250,timeout=90000)
  second=pg.evaluate('MM_WAR.getSnapshot()')
  check('live source is Kraken BTC/USD',second['provider']=='Kraken · BTC/USD spot' and second['mode']=='live')
  check('new source timestamps received',second['timestamp']>first['timestamp'])
  check('BTC one dollar scale',second['destruction']['pipSize']==1)
  check('daily metadata from source',second['daily']['session']['id'].startswith('kraken-btc-d1-'))
  check('HD single quality',second['quality']=='hd' and pg.locator('#quality').count()==0)
  pg.wait_for_function("document.querySelector('.mm1831-live-indicator')?.dataset.state==='connected'",timeout=15000)
  check('BTC chat connected',pg.locator('.mm1831-chat').get_attribute('data-target')=='MARKET:BITSTAMP:BTCUSD')
  check('login required for posting',pg.locator('.mm1832-auth-open').is_visible() and pg.locator('#mm1831-text').count()==0)
  a=pg.locator('.battle-panel').bounding_box();c=pg.locator('.mm1831-chat').bounding_box();check('desktop chat beside arena',c['x']>=a['x']+a['width'])
  check('switch links for both assets',pg.locator('#war-market-selector a').count()==2)
  pg.set_viewport_size({'width':390,'height':844});pg.wait_for_timeout(500)
  a=pg.locator('.battle-panel').bounding_box();c=pg.locator('.mm1831-chat').bounding_box();check('mobile chat below arena',c['y']>=a['y']+a['height']-1)
  check('mobile no horizontal overflow',pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
  out['samples']=[{k:s[k] for k in ['version','price','timestamp','provider','points','daily','liveFeed']} for s in [first,second]]
  check('no JavaScript exceptions',not out['errors']);b.close()
 out['btcPageSha256']=hashlib.sha256(pages['/assets/btc-war-3d.html?v=1.0']).hexdigest()
 out['ok']=True
except Exception as e:out['error']=str(e)
finally:
 out['checkedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();Path('btc-production-check.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out))
if not out['ok']:raise SystemExit(1)
