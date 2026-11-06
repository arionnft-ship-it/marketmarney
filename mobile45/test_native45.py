from pathlib import Path
import subprocess,time,xml.etree.ElementTree as ET,json,re
OUT=Path('device45');OUT.mkdir(exist_ok=True)
PKG='com.marketmarney.mobile.beta45';checks=[]
labels={'Beranda','Berita','Market Live','Social Marney'}
def adb(*args,check=True,timeout=60):
 p=subprocess.run(['adb',*args],capture_output=True,timeout=timeout)
 if check and p.returncode:raise RuntimeError(p.stderr.decode(errors='replace')+p.stdout.decode(errors='replace'))
 return p.stdout
def record(name,ok):
 checks.append({'name':name,'passed':bool(ok)});print(('PASS: ' if ok else 'FAIL: ')+name,flush=True)
def dump(name):
 raw=b''
 for attempt in range(5):
  adb('shell','uiautomator','dump','--compressed','/sdcard/mm45.xml',check=False)
  raw=adb('exec-out','cat','/sdcard/mm45.xml',check=False)
  if raw.lstrip().startswith(b'<?xml'):break
  time.sleep(2)
 if not raw.lstrip().startswith(b'<?xml'):raise RuntimeError('UI hierarchy unavailable')
 (OUT/(name+'.xml')).write_bytes(raw);tree=ET.fromstring(raw)
 text='\n'.join(n.get('text','')+' '+n.get('content-desc','') for n in tree.iter())
 return tree,text
def tap(node):
 a=list(map(int,re.findall(r'\d+',node.get('bounds',''))))
 if len(a)!=4:raise RuntimeError('No target bounds')
 adb('shell','input','tap',str((a[0]+a[2])//2),str((a[1]+a[3])//2))
def ready(tab,text):
 if 'Belum terhubung' in text:return False
 if tab==0:return 'MarketMarney' in text or 'Market Intelligence' in text
 if tab==1:return 'NEWSROOM' in text and 'artikel' in text.lower()
 if tab==2:return 'Market Intelligence Desk' in text or 'TRADINGVIEW / CHART TERMINAL' in text
 return 'Cerita pasar.' in text and 'Linimasa' in text
def wait(tab,name):
 tree=None;text='';ok=False
 for attempt in range(10):
  tree,text=dump(name);ok=ready(tab,text)
  if ok:break
  for n in tree.iter():
   if n.get('text')=='Coba lagi':tap(n);break
  time.sleep(4)
 return tree,text,ok
adb('install','-r','apk/Marney45.apk',timeout=90)
adb('shell','wm','size','480x900');adb('shell','wm','density','180')
(OUT/'webview.txt').write_bytes(adb('shell','dumpsys','webviewupdate'))
try:
 for tab in range(4):
  adb('shell','am','force-stop',PKG);adb('logcat','-c')
  adb('shell','am','start','-W','-n',PKG+'/com.marketmarney.mobile.MainActivity','--ei','startTab',str(tab))
  time.sleep(9);tree,text,ok=wait(tab,'tab-'+str(tab))
  record('Tab '+str(tab)+': expected content',ok)
  record('Tab '+str(tab)+': four native destinations',labels.issubset({n.get('content-desc','') for n in tree.iter()}))
  record('Tab '+str(tab)+': process alive',bool(adb('shell','pidof',PKG,check=False).strip()))
  record('Tab '+str(tab)+': no 404 page','MARKETMARNEY / 404' not in text)
  log=adb('logcat','-d','-s','AndroidRuntime:E',check=False);(OUT/('errors-'+str(tab)+'.txt')).write_bytes(log)
  record('Tab '+str(tab)+': no fatal exception',('Process: '+PKG).encode() not in log)
  (OUT/('tab-'+str(tab)+'.png')).write_bytes(adb('exec-out','screencap','-p'))
 # Social -> News -> Social -> News reuses the two fully loaded pages.
 time.sleep(5);adb('logcat','-c')
 for index,label in [(1,'Berita'),(3,'Social Marney'),(1,'Berita')]:
  tree,_=dump('before-switch')
  candidates=[n for n in tree.iter() if n.get('content-desc')==label and n.get('clickable')=='true']
  if not candidates:raise RuntimeError('Missing native tab '+label)
  tap(candidates[-1]);time.sleep(4);_,_,ok=wait(index,'warm-'+str(index));record('Warm sequence '+label+': content visible',ok);time.sleep(2)
 nav=adb('logcat','-d','-s','MM45_NAV:I',check=False).decode(errors='replace');(OUT/'navigation.log').write_text(nav)
 record('Return to Social uses warm page, no explicit loadUrl', 'warm tab=3' in nav)
 record('Return to News uses warm page, no explicit loadUrl', 'warm tab=1' in nav)
 (OUT/'memory.txt').write_bytes(adb('shell','dumpsys','meminfo',PKG,check=False))
 print(nav)
finally:
 (OUT/'results.json').write_text(json.dumps({'checks':checks,'passed':sum(c['passed'] for c in checks),'failed':sum(not c['passed'] for c in checks),'real_login_tested':False,'note':'Warm timings measure native tab switching, not full rendering latency on the user phone.'},indent=2))
if any(not c['passed'] for c in checks):raise SystemExit('Device checks failed')
