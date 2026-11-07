from pathlib import Path
import urllib.request,urllib.error,json,datetime,hashlib
from playwright.sync_api import sync_playwright
out={'ok':False,'checks':[],'errors':[],'method':'Read-only public HTTPS and real WTI perpetual API/WebSocket; layout tests pause 3D frame loop, not a GPU benchmark. No public posts, wallet calls, logins or orders.'}
def ck(n,v):
 out['checks'].append({'name':n,'ok':bool(v)});assert v,n
def get(p,expected=200):
 try:r=urllib.request.urlopen(urllib.request.Request('https://marketmarney.com'+p,headers={'Accept-Encoding':'identity','User-Agent':'MarketMarney-OIL-War-Verification'}),timeout=25)
 except urllib.error.HTTPError as e:r=e
 data=r.read(6500000);ck(p+' HTTP',r.status==expected);return data
try:
 paths=['/_railway/health','/','/akun.html','/api/auth/android/config','/api/content','/assets/oil-war-3d.html?v=1.0','/assets/oil-war-layout.js?v=1.0','/assets/oil-war-chat.js?v=1.0','/api/oil-war/clock','/assets/xau-war-3d.html?v=7.8','/assets/btc-war-3d.html?v=1.0','/api/xau-war/mt4/health']
 pages={p:get(p) for p in paths}
 for p in ['/api/xau-war/mt4/arena','/api/xau-war/mt4/status','/api/xau-war/mt4/stream']:get(p,401)
 for target in ['HYPERLIQUID:WTI','OANDA:XAUUSD','BITSTAMP:BTCUSD']:
  d=json.loads(get('/api/discussions?kind=analysis&target=MARKET%3A'+target.replace(':','%3A')+'&sort=newest'));ck(target+' room accessible anonymously',isinstance(d.get('items'),list) and d.get('user') is None)
 get('/api/discussions?kind=analysis&target=MARKET%3AHYPERLIQUID%3AARBITRARY&sort=newest',404)
 ck('oil does not use gold/bitcoin feed',b'wss://api.hyperliquid.xyz/ws' in pages['/assets/oil-war-3d.html?v=1.0'] and b'api.gold-api.com' not in pages['/assets/oil-war-3d.html?v=1.0'] and b'ws.kraken.com' not in pages['/assets/oil-war-3d.html?v=1.0'])
 ck('XAU original price source intact',b'api.gold-api.com/price/XAU' in pages['/assets/xau-war-3d.html?v=7.8'])
 ck('BTC original price source intact',b'wss://ws.kraken.com/v2' in pages['/assets/btc-war-3d.html?v=1.0'])
 ck('FBS data remains private',json.loads(pages['/api/xau-war/mt4/health'])['publicDisplay'] is False)
 ck('latest signup fields preserved',b'id="signupEmail"' in pages['/akun.html'] and b'id="signupName"' in pages['/akun.html'])
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  pg=browser.new_page(viewport={'width':1440,'height':1000});pg.add_init_script("const r=requestAnimationFrame.bind(window);window.requestAnimationFrame=f=>f.name==='frame'?0:r(f);")
  pg.on('pageerror',lambda e:out['errors'].append(str(e)))
  pg.goto('https://marketmarney.com/assets/oil-war-3d.html?v=1.0',wait_until='load',timeout=60000)
  pg.wait_for_function('window.MM_WAR?.getSnapshot().state==="live"',polling=250,timeout=90000)
  first=pg.evaluate('MM_WAR.getSnapshot()')
  pg.wait_for_function('(t)=>MM_WAR.getSnapshot().timestamp>t',arg=first['timestamp'],polling=250,timeout=90000)
  second=pg.evaluate('MM_WAR.getSnapshot()')
  ck('real WTI perpetual source',second['provider']=='trade[XYZ]/Hyperliquid · WTI perp' and second['mode']=='live')
  ck('source timestamps advance',second['timestamp']>first['timestamp'])
  ck('coin xyz:CL',second['liveFeed']['coin']=='xyz:CL')
  ck('oil pip 0.01 and HD only',second['destruction']['pipSize']==.01 and second['quality']=='hd' and pg.locator('#quality').count()==0)
  ck('daily metadata from source',second['daily']['session']['id'].startswith('hl-wti-d1-'))
  ck('instrument difference clearly labeled','bukan minyak spot' in pg.locator('section.notice').inner_text())
  pg.wait_for_function("document.querySelector('.mm1831-live-indicator')?.dataset.state==='connected'",timeout=15000)
  ck('dedicated oil chat connected',pg.locator('.mm1831-chat').get_attribute('data-target')=='MARKET:HYPERLIQUID:WTI')
  ck('anonymous send gated by login',pg.locator('.mm1832-auth-open').is_visible() and pg.locator('#mm1831-text').count()==0)
  a=pg.locator('.battle-panel').bounding_box();c=pg.locator('.mm1831-chat').bounding_box();ck('desktop side chat',c['x']>=a['x']+a['width'])
  ck('3 arena buttons',pg.locator('#war-market-selector a').count()==3)
  pg.set_viewport_size({'width':390,'height':844});pg.wait_for_timeout(500);a=pg.locator('.battle-panel').bounding_box();c=pg.locator('.mm1831-chat').bounding_box()
  ck('mobile stacked',c['y']>=a['y']+a['height']-1);ck('mobile no horizontal overflow',pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
  out['samples']=[{k:s[k] for k in ['version','price','timestamp','provider','points','daily','liveFeed']} for s in [first,second]]
  ck('no JavaScript exceptions',not out['errors']);pg.close()
  for symbol,url in [('gold','xau-war-3d.html'),('bitcoin','btc-war-3d.html')]:
   pg=browser.new_page(viewport={'width':1200,'height':900});pg.add_init_script("const r=requestAnimationFrame.bind(window);window.requestAnimationFrame=f=>f.name==='frame'?0:r(f);")
   pg.goto('https://marketmarney.com/assets/'+url,wait_until='load',timeout=60000)
   ck(symbol+' has oil switch',pg.locator('#war-market-selector a[href*="oil-war"]').count()==1);pg.close()
  browser.close()
 out['pageSha256']=hashlib.sha256(pages['/assets/oil-war-3d.html?v=1.0']).hexdigest();out['ok']=True
except Exception as e:out['error']=str(e)
finally:
 out['checkedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();Path('oil-production-check.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out))
if not out['ok']:raise SystemExit(1)
