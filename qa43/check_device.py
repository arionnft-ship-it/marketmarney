from pathlib import Path
import subprocess,time,xml.etree.ElementTree as E,json,re,urllib.request
OUT=Path('device43');OUT.mkdir(exist_ok=True)
PKG='com.marketmarney.mobile.beta43';LABELS={'Beranda','Berita','Market Live','Social Marney'}
results=[];failures=[]
def adb(*args,timeout=40,check=True):
 p=subprocess.run(['adb',*args],capture_output=True,timeout=timeout)
 if check and p.returncode:raise RuntimeError(p.stderr.decode(errors='replace') or p.stdout.decode(errors='replace'))
 return p.stdout+p.stderr if not check else p.stdout

def dump(tab):
 adb('shell','uiautomator','dump','/sdcard/window43.xml')
 data=adb('exec-out','cat','/sdcard/window43.xml');(OUT/f'tab-{tab}.xml').write_bytes(data)
 root=E.fromstring(data);text='\n'.join(n.attrib.get('text','')+' '+n.attrib.get('content-desc','') for n in root.iter())
 return root,text

def check(name,value):
 (results if value else failures).append(name);print(('PASS: ' if value else 'FAIL: ')+name,flush=True)

for endpoint in ['/api/content','/beranda-trader.html']:
 try:
  with urllib.request.urlopen('https://marketmarney.com'+endpoint,timeout=20) as r:print('HOST READ',endpoint,r.status,flush=True)
 except Exception as e:print('HOST READ ERROR',str(e),flush=True)
adb('install','-r','apk/Marney43.apk',timeout=80)
adb('shell','wm','size','480x900');adb('shell','wm','density','180')
adb('shell','settings','put','global','private_dns_mode','off',check=False)
adb('shell','svc','wifi','enable',check=False)
time.sleep(8)
(OUT/'webview-provider.txt').write_bytes(adb('shell','dumpsys','webviewupdate'))
(OUT/'dns.txt').write_bytes(adb('shell','ping','-c','1','-W','5','marketmarney.com',check=False))
(OUT/'connectivity.txt').write_bytes(adb('shell','dumpsys','connectivity',check=False))
for tab in [1,3,2,0]:
 try:
  adb('shell','am','force-stop',PKG);adb('logcat','-c')
  adb('shell','am','start','-W','-n',PKG+'/com.marketmarney.mobile.MainActivity','--ei','startTab',str(tab))
  time.sleep(10);root=None;last='';ready=False
  for attempt in range(4):
   root,last=dump(tab)
   ready=(tab==0 and ('MarketMarney' in last or 'Market Intelligence' in last) and 'Belum terhubung' not in last and 'Gagal terhubung' not in last) or (tab==1 and 'NEWSROOM' in last and 'artikel' in last and 'Belum terhubung' not in last) or (tab==2 and ('Market Intelligence Desk' in last or 'TRADINGVIEW / CHART TERMINAL' in last)) or (tab==3 and 'Temukan komunitas Anda.' in last and 'Linimasa' in last)
   if ready:break
   if 'Coba lagi' in last:
    for n in root.iter():
     if n.attrib.get('text')=='Coba lagi':
      v=[int(x) for x in re.findall(r'\d+',n.attrib['bounds'])];adb('shell','input','tap',str((v[0]+v[2])//2),str((v[1]+v[3])//2));break
   time.sleep(5)
  (OUT/f'tab-{tab}.png').write_bytes(adb('exec-out','screencap','-p'))
  check(f'Tab {tab}: process running',bool(adb('shell','pidof',PKG).strip()))
  check(f'Tab {tab}: four bottom labels',LABELS.issubset({n.attrib.get('content-desc','') for n in root.iter()}))
  check(f'Tab {tab}: no 404','Halaman ini tidak ditemukan.' not in last)
  check(f'Tab {tab}: expected page loaded',ready)
  (OUT/f'console-{tab}.txt').write_bytes(adb('logcat','-d','-s','chromium','AndroidRuntime',check=False))
  logs=adb('logcat','-d','-s','AndroidRuntime:E');check(f'Tab {tab}: no app crash',('Process: '+PKG).encode() not in logs)
 except Exception as e:
  failures.append(f'Tab {tab}: {e}');print('FAIL:',str(e),flush=True)
(OUT/'results.json').write_text(json.dumps({'passed':results,'failures':failures,'real_google_login_tested':False,'authenticated_posts_tested':False},indent=2))
print('RESULT',len(results),'passed;',len(failures),'failed',flush=True)
if failures:raise SystemExit(1)
