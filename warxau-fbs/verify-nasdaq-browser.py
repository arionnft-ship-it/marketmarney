from playwright.sync_api import sync_playwright
from pathlib import Path
import json,os,datetime
BASE=os.environ.get('NASDAQ_TEST_URL','http://127.0.0.1:8977')
OUT=Path(os.environ.get('NASDAQ_TEST_OUT','nasdaq-test-results'));OUT.mkdir(exist_ok=True)
PAUSE="const r=requestAnimationFrame.bind(window);window.requestAnimationFrame=f=>f.name==='frame'?0:r(f);"
out={'ok':False,'checks':[],'errors':[],'liveAvailable':False,'scope':'NASDAQ live deliberately unavailable. Manual DEMO and layout tests. No login, posts or orders. Normal 3D checked separately using software rendering.'}
def ck(n,v):
 out['checks'].append({'name':n,'ok':bool(v)});assert v,n
def ss(pg):return pg.evaluate('MM_WAR.getSnapshot()')
try:
 with sync_playwright() as p:
  b=p.chromium.launch(headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  pg=b.new_page(viewport={'width':1440,'height':1000});pg.add_init_script(PAUSE);pg.on('pageerror',lambda e:out['errors'].append(str(e)))
  websockets=[];pg.on('websocket',lambda w:websockets.append(w.url))
  pg.goto(BASE+'/assets/nasdaq-war-3d.html?v=1.0',wait_until='load',timeout=60000)
  pg.wait_for_function('window.MM_WAR?.ready',timeout=30000);s=ss(pg)
  ck('live state remains waiting',s['state']=='waiting' and s['mode']=='live')
  ck('live price empty',s['price'] is None and s['points']==0)
  ck('unavailable feed explicit',s['liveFeed']['liveAvailable'] is False and 'BELUM TERHUBUNG' in pg.locator('#status').inner_text())
  ck('no fabricated daily session',s['daily']['session'] is None)
  ck('no market websocket created',len(websockets)==0)
  ck('no free starting tanks',s['battle']['buy']['added']['tank']==0)
  ck('4 arena selectors',pg.locator('#war-market-selector a').count()==4)
  ck('NASDAQ selected',pg.locator('#war-market-selector a[aria-current=page]').inner_text()=='NASDAQ WAR')
  pg.wait_for_selector('.mm1831-chat');ck('dedicated NASDAQ room',pg.locator('.mm1831-chat').get_attribute('data-target')=='MARKET:NASDAQ:NDX')
  ck('anonymous must log in to send',pg.locator('.mm1832-auth-open').is_visible() and pg.locator('#mm1831-text').count()==0)
  a=pg.locator('.battle-panel').bounding_box();c=pg.locator('.mm1831-chat').bounding_box();ck('desktop chat right',c['x']>=a['x']+a['width'])
  ck('HD only',s['quality']=='hd' and pg.locator('#quality').count()==0)
  pg.locator('#mode-demo').click();s=ss(pg);start=s['price'];ck('demo manual and labeled',s['mode']=='demo' and 'DEMO' in pg.locator('#status').inner_text())
  pg.locator('[data-pip-step="20"]').click();s=ss(pg)
  ck('20 points moves demo by 20',abs(s['price']-start-20)<0.00001)
  ck('20 points triggers 4 infantry 1 tank',s['destruction']['triggered']['up']['infantry']==4 and s['destruction']['triggered']['up']['tank']==1)
  pg.locator('#demo-daily-close').click();ck('demo close stops battle',ss(pg)['daily']['phase']=='closed')
  pg.locator('#mode-live').click();s=ss(pg);ck('return to feed clears synthetic price',s['price'] is None and s['state']=='waiting' and s['points']==0)
  pg.set_viewport_size({'width':390,'height':844});pg.wait_for_timeout(500);a=pg.locator('.battle-panel').bounding_box();c=pg.locator('.mm1831-chat').bounding_box()
  ck('mobile chat below',c['y']>=a['y']+a['height']-1);ck('mobile no horizontal overflow',pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
  ck('no layout/demo JS exceptions',not out['errors']);pg.close()
  # Existing arenas must gain only a switch; their sources and scales remain unchanged.
  for name,pip,source in [('xau',0.01,'api.gold-api.com'),('btc',1,'wss://ws.kraken.com'),('oil',0.01,'api.hyperliquid.xyz')]:
   pg=b.new_page(viewport={'width':1200,'height':900});pg.add_init_script(PAUSE)
   pg.goto(BASE+'/assets/'+name+'-war-3d.html?v=1.0',wait_until='load',timeout=60000);pg.wait_for_function('window.MM_WAR?.ready',timeout=30000)
   ck(name+' original scale preserved',ss(pg)['destruction']['pipSize']==pip)
   ck(name+' source preserved',source in pg.content());ck(name+' NASDAQ switch available',pg.locator('#war-market-selector a[href*="nasdaq-war"]').count()==1);pg.close()
  # Normal renderer, explicitly labeled demo, no invented live market values.
  pg=b.new_page(viewport={'width':1280,'height':950});pg.on('pageerror',lambda e:out['errors'].append(str(e)))
  pg.goto(BASE+'/assets/nasdaq-war-3d.html?v=1.0',wait_until='load',timeout=60000);pg.wait_for_function('window.MM_WAR?.ready',timeout=30000)
  pg.locator('#mode-demo').click();pg.locator('[data-quick-pips="20"]').click()
  pg.wait_for_function('MM_WAR.getSnapshot().sceneTime>1',polling=500,timeout=60000)
  s=ss(pg);ck('normal 3D renderer advances',s['sceneTime']>1 and s['renderer']=='webgl2')
  out['normalRender']={k:s[k] for k in ['fps','sceneTime','renderer','quality','drawCalls']}
  pg.evaluate('window.scrollTo(0,0)');pg.screenshot(path=str(OUT/'NASDAQ-WAR-Desktop-DEMO.png'),timeout=60000)
  ck('no render JS exceptions',not out['errors']);b.close()
 out['ok']=True
except Exception as e:out['error']=str(e)
finally:
 out['checkedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();(OUT/'browser.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out))
if not out['ok']:raise SystemExit(1)
