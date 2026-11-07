from playwright.sync_api import sync_playwright
from pathlib import Path
import json,os,datetime
BASE=os.environ.get('BTC_TEST_URL','http://127.0.0.1:8977')
OUT=Path(os.environ.get('BTC_TEST_OUT','btc-test-results'));OUT.mkdir(exist_ok=True)
MOCK=r'''window.__testSockets=[];window.WebSocket=class {constructor(url){this.url=url;window.__testSockets.push(this);setTimeout(()=>this.onopen?.({}),1);}send(s){const d=JSON.parse(s);if(d.params?.channel==='ohlc'){const b=Math.floor(Date.now()/86400000)*86400000;setTimeout(()=>this.onmessage?.({data:JSON.stringify({channel:'ohlc',type:'snapshot',data:[{symbol:'BTC/USD',interval:1440,interval_begin:new Date(b).toISOString()}]})}),10);}if(d.params?.channel==='trade'){let i=0;const price=[75000,75005,75020,75050,75100];this.t=setInterval(()=>{this.onmessage?.({data:JSON.stringify({channel:'trade',type:i===0?'snapshot':'update',data:[{symbol:'BTC/USD',price:price[Math.min(i,4)],trade_id:100+i,timestamp:new Date().toISOString()}]})});i++;},400);}}close(){clearInterval(this.t);}};'''
PAUSE="const r=requestAnimationFrame.bind(window);window.requestAnimationFrame=f=>f.name==='frame'?0:r(f);"
out={'ok':False,'checks':[],'errors':[],'scope':'Browser fixtures plus real Kraken websocket. No account login or public posts. Layout tests pause 3D; normal render checked separately.'}
def ck(n,v):
 out['checks'].append({'name':n,'ok':bool(v)});assert v,n
def snapshot(pg):return pg.evaluate('MM_WAR.getSnapshot()')
try:
 with sync_playwright() as p:
  b=p.chromium.launch(headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  pg=b.new_page(viewport={'width':1440,'height':1000})
  pg.add_init_script(MOCK+PAUSE);pg.on('pageerror',lambda e:out['errors'].append(str(e)))
  pg.goto(BASE+'/assets/btc-war-3d.html?v=1.0',wait_until='load',timeout=60000)
  pg.wait_for_function('window.MM_WAR?.getSnapshot().points>=5',polling=200,timeout=30000)
  ss=snapshot(pg)
  ck('BTC fixture price accepted',ss['state']=='live' and ss['price']==75100)
  ck('BTC scale one USD',ss['destruction']['pipSize']==1)
  ck('expected 100 USD reinforcement triggers',ss['destruction']['triggered']['up']['infantry']==20 and ss['destruction']['triggered']['up']['tank']==5)
  ck('heli and jet triggers',ss['destruction']['triggered']['up']['heli']==2 and ss['destruction']['triggered']['up']['jet']==1)
  ck('HD only',ss['quality']=='hd' and pg.locator('#quality').count()==0)
  pg.wait_for_selector('.mm1831-chat',timeout=10000)
  ck('BTC chat isolated from gold',pg.locator('.mm1831-chat').get_attribute('data-target')=='MARKET:BITSTAMP:BTCUSD')
  ck('both arena links present',pg.locator('#war-market-selector a').count()==2)
  ck('gold link preserved',pg.locator('#war-market-selector a').first.get_attribute('href').startswith('/assets/xau-war-3d.html'))
  a=pg.locator('.battle-panel').bounding_box();c=pg.locator('.mm1831-chat').bounding_box();ck('desktop side chat',c['x']>=a['x']+a['width'])
  pg.set_viewport_size({'width':390,'height':844});pg.wait_for_timeout(500);a=pg.locator('.battle-panel').bounding_box();c=pg.locator('.mm1831-chat').bounding_box()
  ck('mobile chat below arena',c['y']>=a['y']+a['height']-1);ck('mobile no overflow',pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
  pg.locator('#mode-demo').click();pg.locator('[data-pip-step="20"]').click();ck('demo separate',snapshot(pg)['mode']=='demo')
  pg.locator('#demo-daily-close').click();ck('daily close stops battle',snapshot(pg)['daily']['phase']=='closed')
  ck('no fixture JavaScript errors',not out['errors']);pg.close()
  # Full normal animation loop, with explicitly synthetic test feed.
  pg=b.new_page(viewport={'width':1024,'height':850});pg.add_init_script(MOCK);pg.on('pageerror',lambda e:out['errors'].append(str(e)))
  pg.goto(BASE+'/assets/btc-war-3d.html?v=1.0',wait_until='load',timeout=60000)
  pg.wait_for_function('window.MM_WAR?.getSnapshot().sceneTime>1',polling=500,timeout=60000)
  ss=snapshot(pg);ck('normal 3D loop advances',ss['sceneTime']>1);ck('WebGL renderer initialized',ss['renderer']=='webgl2')
  out['normalRender']={k:ss[k] for k in ['fps','sceneTime','quality','renderer','drawCalls']}
  pg.locator('#mode-demo').click();pg.locator('[data-quick-pips="20"]').click();pg.wait_for_timeout(2000)
  pg.screenshot(path=str(OUT/'BTCUSD-War-DEMO.png'),full_page=False,timeout=60000)
  ck('normal loop no JavaScript errors',not out['errors']);pg.close()
  # Real source, no WebSocket mock. Frame loop paused to isolate transport.
  pg=b.new_page(viewport={'width':1440,'height':1000});pg.add_init_script(PAUSE);pg.on('pageerror',lambda e:out['errors'].append(str(e)))
  pg.goto(BASE+'/assets/btc-war-3d.html?v=1.0',wait_until='load',timeout=60000)
  pg.wait_for_function('window.MM_WAR?.getSnapshot().state==="live"',polling=250,timeout=90000)
  first=snapshot(pg)
  pg.wait_for_function('(t)=>MM_WAR.getSnapshot().timestamp>t',arg=first['timestamp'],polling=250,timeout=90000)
  second=snapshot(pg)
  ck('real BTC websocket source',second['provider']=='Kraken · BTC/USD spot' and second['mode']=='live')
  ck('real source timestamp advances',second['timestamp']>first['timestamp'])
  ck('daily metadata from Kraken',second['daily']['session']['id'].startswith('kraken-btc-d1-'))
  ck('real price valid',second['price']>0 and second['liveFeed']['transport']=='WebSocket')
  out['realSamples']=[{k:s[k] for k in ['price','timestamp','provider','version','points','daily','liveFeed']} for s in [first,second]]
  ck('real feed no JavaScript errors',not out['errors']);pg.close()
  # Gold source and default scale must remain intact.
  pg=b.new_page(viewport={'width':1200,'height':900});pg.add_init_script(PAUSE)
  pg.goto(BASE+'/assets/xau-war-3d.html?v=7.8',wait_until='load',timeout=60000);pg.wait_for_function('window.MM_WAR?.ready',timeout=30000)
  s=snapshot(pg);ck('gold default scale intact',s['destruction']['pipSize']==0.01)
  ck('gold page links to BTC',pg.locator('#war-market-selector a[href*="btc-war"]').count()==1)
  b.close()
 out['ok']=all(c['ok'] for c in out['checks'])
except Exception as e:
 out['error']=str(e)
finally:
 out['checkedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();(OUT/'browser.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2))
if not out['ok']:raise SystemExit(1)
