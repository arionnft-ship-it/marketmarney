from pathlib import Path
import urllib.request,urllib.error,json,datetime,subprocess,os
out={'ok':False,'checks':[],'liveAvailable':False,'scope':'Read-only public access checks and local browser DEMO. No live NASDAQ claim, login, wallet, public post or trading operation.'}
def check(n,v):
 out['checks'].append({'name':n,'ok':bool(v)});assert v,n
def get(path,expected=200):
 try:r=urllib.request.urlopen(urllib.request.Request('https://marketmarney.com'+path,headers={'User-Agent':'MarketMarney-NASDAQ-Release-Check','Accept-Encoding':'identity'}),timeout=25)
 except urllib.error.HTTPError as e:r=e
 data=r.read(6500000);check(path+' HTTP',r.status==expected);return data
try:
 for p in ['/_railway/health','/','/akun.html','/api/auth/android/config','/api/content','/assets/nasdaq-war-3d.html?v=1.0','/assets/nasdaq-war-layout.js?v=1.0','/assets/nasdaq-war-chat.js?v=1.0','/assets/xau-war-3d.html?v=7.8','/assets/btc-war-3d.html?v=1.0','/assets/oil-war-3d.html?v=1.0']:
  get(p)
 d=json.loads(get('/api/nasdaq-war/status'));check('no invented price provider or session',d['liveAvailable'] is False and d['price'] is None and d['provider'] is None and d['dailySession'] is None)
 for p in ['/api/xau-war/mt4/arena','/api/xau-war/mt4/status','/api/xau-war/mt4/stream']:get(p,401)
 d=json.loads(get('/api/xau-war/mt4/health'));check('FBS remains private',d['publicDisplay'] is False)
 for room in ['NASDAQ:NDX','HYPERLIQUID:WTI','OANDA:XAUUSD','BITSTAMP:BTCUSD']:
  d=json.loads(get('/api/discussions?kind=analysis&target=MARKET%3A'+room.replace(':','%3A')+'&sort=newest'));check(room+' readable as guest',isinstance(d.get('items'),list) and d.get('user') is None)
 get('/api/discussions?kind=analysis&target=MARKET%3ANASDAQ%3AARBITRARY&sort=newest',404)
 env=dict(os.environ,NASDAQ_TEST_URL='https://marketmarney.com',NASDAQ_TEST_OUT='nasdaq-production-results')
 subprocess.run(['python3','warxau-fbs/verify-nasdaq-browser.py'],env=env,check=True)
 out['browser']=json.loads(Path('nasdaq-production-results/browser.json').read_text());check('production browser tests pass',out['browser']['ok']);out['ok']=True
except Exception as e:out['error']=str(e)
finally:
 out['checkedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();Path('nasdaq-production-check.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out))
if not out['ok']:raise SystemExit(1)
