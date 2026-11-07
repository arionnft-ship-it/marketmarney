from pathlib import Path
import json,os,datetime,urllib.request,urllib.error
from playwright.sync_api import sync_playwright
BASE=os.environ.get('IHSG_TEST_URL','http://127.0.0.1:8977')
OUT=Path(os.environ.get('IHSG_TEST_OUT','ihsg-test-results'));OUT.mkdir(exist_ok=True)
PUBLIC=BASE.startswith('https://marketmarney.com')
PAUSE="const r=requestAnimationFrame.bind(window);window.requestAnimationFrame=f=>f.name==='frame'?0:r(f);"
out={'ok':False,'checks':[],'errors':[],'liveAvailable':False,'method':'Manual DEMO, layout and guest chat tests. 3D frames paused during layout tests and enabled separately for software-rendering check. No accounts, posts, orders or fake live prices.'}
def ck(n,v):
 out['checks'].append({'name':n,'ok':bool(v)});assert v,n
def get(p,expected=200):
 try:r=urllib.request.urlopen(urllib.request.Request(BASE+p,headers={'Accept-Encoding':'identity','User-Agent':'MarketMarney-IHSG-Check'}),timeout=20)
 except urllib.error.HTTPError as e:r=e
 b=r.read(6500000);ck(p+' HTTP',r.status==expected);return b
def snap(pg):return pg.evaluate('MM_WAR.getSnapshot()')
try:
 if PUBLIC:
  for p in ['/_railway/health','/','/akun.html','/api/auth/android/config','/api/content','/assets/ihsg-war-3d.html?v=1.0','/assets/ihsg-war-layout.js?v=1.0','/assets/ihsg-war-chat.js?v=1.0']:get(p)
  for p in ['/api/xau-war/mt4/arena','/api/xau-war/mt4/status','/api/xau-war/mt4/stream']:get(p,401)
  ck('FBS still private',json.loads(get('/api/xau-war/mt4/health'))['publicDisplay'] is False)
  for room in ['IDX:COMPOSITE','NASDAQ:NDX','HYPERLIQUID:WTI','OANDA:XAUUSD','BITSTAMP:BTCUSD']:
   d=json.loads(get('/api/discussions?kind=analysis&target=MARKET%3A'+room.replace(':','%3A')+'&sort=newest'));ck(room+' guest-readable',isinstance(d.get('items'),list) and d.get('user') is None)
  get('/api/discussions?kind=analysis&target=MARKET%3AIDX%3AARBITRARY&sort=newest',404)
 d=json.loads(get('/api/ihsg-war/status'));ck('no live value/provider/calendar invented',d['liveAvailable'] is False and d['price'] is None and d['provider'] is None and d['dailySession'] is None and d['symbol']=='IHSG')
 with sync_playwright() as p:
  b=p.chromium.launch(headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  pg=b.new_page(viewport={'width':1440,'height':1000});pg.add_init_script(PAUSE);pg.on('pageerror',lambda e:out['errors'].append(str(e)))
  sockets=[];pg.on('websocket',lambda w:sockets.append(w.url));chat=[];pg.on('response',lambda r:chat.append(r.status) if '/api/discussions?' in r.url else None)
  pg.goto(BASE+'/assets/ihsg-war-3d.html?v=1.0',wait_until='load',timeout=60000);pg.wait_for_function('window.MM_WAR?.ready',timeout=30000);s=snap(pg)
  ck('default waiting, never fake live',s['mode']=='live' and s['state']=='waiting' and s['price'] is None and s['points']==0)
  ck('correct unavailable IHSG status',s['liveFeed']['symbol']=='IHSG' and s['liveFeed']['liveAvailable'] is False and 'BELUM TERHUBUNG' in pg.locator('#status').inner_text())
  ck('live daily session absent',s['daily']['session'] is None)
  ck('no external market socket',not sockets);ck('no starting tank granted',s['battle']['buy']['added']['tank']==0)
  ck('5 arena links',pg.locator('#war-market-selector a').count()==5)
  ck('only IHSG selected',pg.locator('#war-market-selector a[aria-current=page]').count()==1 and pg.locator('#war-market-selector a[aria-current=page]').inner_text()=='IHSG WAR')
  pg.wait_for_selector('.mm1831-chat');ck('separate IHSG room',pg.locator('.mm1831-chat').get_attribute('data-target')=='MARKET:IDX:COMPOSITE')
  pg.wait_for_function("document.querySelector('.mm1831-live-indicator')?.dataset.state==='connected'",timeout=15000)
  ck('guest must log in to send',pg.locator('.mm1832-auth-open').is_visible() and pg.locator('#mm1831-text').count()==0)
  pg.wait_for_timeout(3300);ck('chat updates received',len(chat)>=2 and all(x==200 for x in chat))
  a=pg.locator('.battle-panel').bounding_box();c=pg.locator('.mm1831-chat').bounding_box();ck('desktop chat right',c['x']>=a['x']+a['width'])
  ck('HD single quality',s['quality']=='hd' and pg.locator('#quality').count()==0)
  pg.locator('#mode-demo').click();s=snap(pg);start=s['price'];ck('manual demo labeled',s['mode']=='demo' and 'DEMO' in pg.locator('#status').inner_text())
  pg.locator('[data-pip-step="20"]').click();s=snap(pg);ck('20 points yields 4 infantry 1 tank',abs(s['price']-start-20)<0.00001 and s['destruction']['triggered']['up']['infantry']==4 and s['destruction']['triggered']['up']['tank']==1)
  pg.locator('#demo-daily-close').click();ck('demo daily close ends battle',snap(pg)['daily']['phase']=='closed')
  pg.locator('#mode-live').click();s=snap(pg);ck('return from demo clears price',s['price'] is None and s['state']=='waiting' and s['points']==0)
  ck('demo calendar not labeled BEI',pg.locator('body').inner_text().find('bukan jam perdagangan, hari libur, jeda sesi atau penutupan BEI')>=0)
  for width in [390,768]:
   pg.set_viewport_size({'width':width,'height':900});pg.wait_for_timeout(300);a=pg.locator('.battle-panel').bounding_box();c=pg.locator('.mm1831-chat').bounding_box();ck(str(width)+' chat below arena',c['y']>=a['y']+a['height']-1);ck(str(width)+' no horizontal overflow',pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
  ck('no layout exceptions',not out['errors']);pg.close()
  for name,pip,source in [('xau',.01,'api.gold-api.com'),('btc',1,'wss://ws.kraken.com'),('oil',.01,'api.hyperliquid.xyz'),('nasdaq',1,'MMNasdaq')]:
   pg=b.new_page(viewport={'width':1200,'height':900});pg.add_init_script(PAUSE);pg.goto(BASE+'/assets/'+name+'-war-3d.html?v=1.0',wait_until='load',timeout=60000);pg.wait_for_function('window.MM_WAR?.ready',timeout=30000)
   ck(name+' source and scale preserved',snap(pg)['destruction']['pipSize']==pip and source in pg.content());ck(name+' 5 links and IHSG link',pg.locator('#war-market-selector a').count()==5 and pg.locator('#war-market-selector a[href*="ihsg-war"]').count()==1);pg.close()
  pg=b.new_page(viewport={'width':1280,'height':950});pg.on('pageerror',lambda e:out['errors'].append(str(e)))
  pg.goto(BASE+'/assets/ihsg-war-3d.html?v=1.0',wait_until='load',timeout=60000);pg.wait_for_function('window.MM_WAR?.ready',timeout=30000)
  pg.locator('#mode-demo').click();pg.locator('[data-quick-pips="20"]').click();pg.wait_for_function('MM_WAR.getSnapshot().sceneTime>1',polling=500,timeout=60000);s=snap(pg)
  ck('normal WebGL loop advances',s['sceneTime']>1 and s['renderer']=='webgl2');out['softwareRenderer']={k:s[k] for k in ['fps','sceneTime','renderer','quality','drawCalls']}
  pg.evaluate('window.scrollTo(0,0)');pg.screenshot(path=str(OUT/'IHSG-WAR-Desktop-DEMO.png'),timeout=60000)
  pg.set_viewport_size({'width':390,'height':844});pg.wait_for_timeout(800);pg.screenshot(path=str(OUT/'IHSG-WAR-Mobile-DEMO.png'),timeout=60000)
  ck('no render exceptions',not out['errors']);b.close()
 out['ok']=True
except Exception as e:out['error']=str(e)
finally:
 out['checkedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();(OUT/'browser.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out))
if not out['ok']:raise SystemExit(1)
