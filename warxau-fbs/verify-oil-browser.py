from playwright.sync_api import sync_playwright
from pathlib import Path
import json,time,datetime,os
BASE=os.environ.get('OIL_TEST_URL','http://127.0.0.1:8978')
OUT=Path(os.environ.get('OIL_TEST_OUT','oil-test-results'));OUT.mkdir(exist_ok=True)
out={'ok':False,'checks':[],'errors':[],'scope':'Isolated test quotes and real WTI perpetual public API. No account logins, orders, wallets or public messages.'}
def ck(n,v):
 out['checks'].append({'name':n,'ok':bool(v)});assert v,n
MOCK="""window.WebSocket=class {constructor(){this.readyState=1;setTimeout(()=>this.onopen?.(),1)}send(s){const d=JSON.parse(s);if(d.subscription?.type==='trades'){let i=0;this.t=setInterval(()=>{const a=[90,90.05,90.2,90.5,91];this.onmessage?.({data:JSON.stringify({channel:'trades',data:[{coin:'xyz:CL',px:String(a[Math.min(i,4)]),time:Date.now(),tid:10000-i}]})});i++},400)}}close(){clearInterval(this.t);this.readyState=3}};"""
PAUSE="const r=requestAnimationFrame.bind(window);window.requestAnimationFrame=f=>f.name==='frame'?0:r(f);"
def route(r):
 p=r.request.post_data_json
 if p['type']=='meta':d={'universe':[{'name':'xyz:CL'}]}
 else:
  b=int(time.time()*1000)//86400000*86400000;d=[{'s':'xyz:CL','i':'1d','t':b,'T':b+86400000-1}]
 r.fulfill(status=200,content_type='application/json',body=json.dumps(d),headers={'Access-Control-Allow-Origin':'*'})
def snap(pg):return pg.evaluate('MM_WAR.getSnapshot()')
try:
 with sync_playwright() as p:
  b=p.chromium.launch(headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  pg=b.new_page(viewport={'width':1440,'height':1000});pg.add_init_script(MOCK+PAUSE);pg.route('https://api.hyperliquid.xyz/info',route);pg.on('pageerror',lambda e:out['errors'].append(str(e)))
  pg.goto(BASE+'/assets/oil-war-3d.html',wait_until='load',timeout=60000)
  pg.wait_for_function('window.MM_WAR?.getSnapshot().points>=5',polling=200,timeout=30000)
  s=snap(pg)
  ck('WTI stream adapter accepts fixture',s['state']=='live' and s['price']==91)
  ck('oil 0.01 scale',s['destruction']['pipSize']==.01)
  ck('one dollar triggers correct units',s['destruction']['triggered']['up']['tank']==5 and s['destruction']['triggered']['up']['infantry']==20)
  ck('helicopter and jet thresholds',s['destruction']['triggered']['up']['heli']==2 and s['destruction']['triggered']['up']['jet']==1)
  ck('dedicated oil chat',pg.locator('.mm1831-chat').get_attribute('data-target')=='MARKET:HYPERLIQUID:WTI')
  ck('three arena links',pg.locator('#war-market-selector a').count()==3)
  ck('one selected oil link',pg.locator('#war-market-selector [aria-current=page]').count()==1 and 'OIL' in pg.locator('#war-market-selector [aria-current=page]').inner_text())
  ck('HD only',s['quality']=='hd' and pg.locator('#quality').count()==0)
  a=pg.locator('.battle-panel').bounding_box();c=pg.locator('.mm1831-chat').bounding_box();ck('desktop side chat',c['x']>=a['x']+a['width'])
  ck('perpetual distinct from FBS label','bukan minyak spot' in pg.locator('section.notice').inner_text())
  pg.set_viewport_size({'width':390,'height':844});pg.wait_for_timeout(300)
  a=pg.locator('.battle-panel').bounding_box();c=pg.locator('.mm1831-chat').bounding_box();ck('mobile stacked',c['y']>=a['y']+a['height']-1);ck('mobile width fits',pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
  pg.locator('#mode-demo').click();pg.locator('#demo-daily-close').click();ck('daily close stops battle',snap(pg)['daily']['phase']=='closed');ck('no fixture exceptions',not out['errors']);pg.close()
  pg=b.new_page(viewport={'width':1280,'height':960});pg.add_init_script(MOCK);pg.route('https://api.hyperliquid.xyz/info',route);pg.on('pageerror',lambda e:out['errors'].append(str(e)))
  pg.goto(BASE+'/assets/oil-war-3d.html',wait_until='load',timeout=60000)
  pg.wait_for_function('window.MM_WAR?.getSnapshot().sceneTime>1',polling=500,timeout=60000)
  s=snap(pg);ck('normal 3D render loop advances',s['sceneTime']>1);ck('WebGL initialized',s['renderer']=='webgl2')
  out['normalRender']={k:s[k] for k in ['fps','sceneTime','quality','renderer','drawCalls']}
  pg.locator('#mode-demo').click();pg.locator('[data-quick-pips="20"]').click();pg.evaluate('window.scrollTo(0,0)');pg.wait_for_timeout(1500)
  pg.screenshot(path=str(OUT/'OIL-WAR-Desktop-DEMO.png'),timeout=60000)
  ck('normal render no exceptions',not out['errors']);pg.close()
  pg=b.new_page(viewport={'width':1440,'height':1000});pg.add_init_script(PAUSE);pg.on('pageerror',lambda e:out['errors'].append(str(e)))
  pg.goto(BASE+'/assets/oil-war-3d.html',wait_until='load',timeout=60000)
  pg.wait_for_function('window.MM_WAR?.getSnapshot().state==="live"',polling=250,timeout=90000)
  first=snap(pg)
  pg.wait_for_function('(t)=>MM_WAR.getSnapshot().timestamp>t',arg=first['timestamp'],polling=250,timeout=90000)
  second=snap(pg)
  ck('actual source is WTI perpetual',second['provider']=='trade[XYZ]/Hyperliquid · WTI perp' and second['mode']=='live')
  ck('real source timestamp advances',second['timestamp']>first['timestamp'])
  ck('source coin exact',second['liveFeed']['coin']=='xyz:CL' and second['liveFeed']['transport']=='WebSocket')
  ck('daily candle from source',second['daily']['session']['id'].startswith('hl-wti-d1-'))
  out['realSamples']=[{k:s[k] for k in ['version','price','timestamp','provider','points','daily','liveFeed']} for s in [first,second]]
  ck('real feed no exceptions',not out['errors']);pg.close()
  for symbol,url,pip in [('gold','xau-war-3d.html',.01),('bitcoin','btc-war-3d.html',1)]:
   pg=b.new_page(viewport={'width':1200,'height':900});pg.add_init_script(PAUSE)
   pg.goto(BASE+'/assets/'+url,wait_until='load',timeout=60000);pg.wait_for_function('window.MM_WAR?.ready',timeout=30000)
   ck(symbol+' pip scale unchanged',snap(pg)['destruction']['pipSize']==pip)
   ck(symbol+' has oil switch',pg.locator('#war-market-selector a[href*="oil-war"]').count()==1)
   pg.close()
  b.close()
 out['ok']=True
except Exception as e:out['error']=str(e)
finally:
 out['checkedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();(OUT/'browser.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2))
if not out['ok']:raise SystemExit(1)
