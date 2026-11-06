from pathlib import Path
import subprocess,time,json,urllib.request,re
import websocket
O=Path('quality412');O.mkdir(exist_ok=True);PKG='com.marketmarney.mobile.beta412';checks=[];ws=None;seq=0

def adb(*args,check=True):
 p=subprocess.run(['adb',*args],capture_output=True,timeout=60)
 if check and p.returncode:raise RuntimeError(p.stderr.decode(errors='replace')+p.stdout.decode(errors='replace'))
 return p.stdout

def record(name,ok):
 checks.append({'name':name,'passed':bool(ok)});print(('PASS: ' if ok else 'FAIL: ')+name,flush=True)
 if not ok:raise AssertionError(name)

def cmd(method,params=None):
 global seq
 seq+=1;ident=seq;ws.send(json.dumps({'id':ident,'method':method,'params':params or {}}))
 while True:
  x=json.loads(ws.recv())
  if x.get('id')==ident:
   if 'error' in x:raise RuntimeError(x['error'])
   return x.get('result',{})

def ev(code):
 r=cmd('Runtime.evaluate',{'expression':code,'returnByValue':True,'awaitPromise':True})
 if r.get('exceptionDetails'):raise RuntimeError(r['exceptionDetails'])
 return r.get('result',{}).get('value')

def wait(code,seconds=40):
 end=time.monotonic()+seconds;last=None
 while time.monotonic()<end:
  try:
   last=ev(code)
   if last:return last
  except Exception as e:last=str(e)
  time.sleep(.5)
 raise RuntimeError('Not ready: '+code+' '+str(last))

try:
 adb('shell','am','force-stop',PKG)
 adb('shell','am','start','-W','-n',PKG+'/com.marketmarney.mobile.MainActivity','--ei','startTab','2')
 pid=adb('shell','pidof',PKG).decode().strip()
 for _ in range(30):
  raw=adb('shell','cat','/proc/net/unix',check=False).decode(errors='replace')
  if 'webview_devtools_remote_'+pid in raw:break
  time.sleep(1)
 adb('forward','tcp:9222','localabstract:webview_devtools_remote_'+pid)
 for _ in range(30):
  try:
   pages=json.load(urllib.request.urlopen('http://127.0.0.1:9222/json',timeout=5))
   page=next(x for x in pages if x.get('type')=='page' and 'marketmarney.com' in x.get('url',''))
   ws=websocket.create_connection(page['webSocketDebuggerUrl'],timeout=30,suppress_origin=True);break
  except Exception:time.sleep(1)
 if not ws:raise RuntimeError('No in-app web page target')
 cmd('Runtime.enable');cmd('Page.enable')
 ready=False
 for attempt in range(2):
  try:wait("location.pathname==='/assets/xau-war-3d.html' && document.readyState!=='loading' && document.body.innerText.toUpperCase().includes('XAU')",45);ready=True;break
  except Exception:
   if attempt==0:cmd('Page.reload',{'ignoreCache':False});time.sleep(3)
 record('Actual public XAUWar page loads within APK',ready)
 record('Correct HTTPS origin',ev("location.origin==='https://marketmarney.com'"))
 record('Existing 7.6 destination selected',ev("new URL(location.href).searchParams.get('v')==='7.6'"))
 record('Demo disclosure visible in page text',ev("document.body.innerText.toUpperCase().includes('DEMO')"))
 record('No 404 page',ev("!document.body.innerText.includes('Halaman ini tidak ditemukan')"))
 record('No horizontal page overflow at tested width',ev('document.documentElement.scrollWidth<=innerWidth+2'))
 time.sleep(1)
 (O/'xauwar-in-app.png').write_bytes(adb('exec-out','screencap','-p'))
 (O/'xauwar-page.txt').write_text(str(ev('document.body.innerText'))[:20000])
 # Read native hierarchy. This is read-only; no simulation or user action on server.
 adb('shell','uiautomator','dump','--compressed','/sdcard/menu412.xml',check=False)
 raw=adb('exec-out','cat','/sdcard/menu412.xml',check=False);(O/'menu.xml').write_bytes(raw)
 record('Native five menus exposed',all(('content-desc="'+x+'"').encode() in raw for x in ['Beranda','Berita','XAUWar','Market Live','Social Marney']))
 current=adb('shell','dumpsys','activity','activities').decode(errors='replace')
 record('App remains foreground rather than Chrome',PKG in '\n'.join(x for x in current.splitlines() if 'ResumedActivity' in x or 'topResumedActivity' in x))
finally:
 if ws:
  try:ws.close()
  except Exception:pass
 (O/'public-results.json').write_text(json.dumps({'checks':checks,'passed':sum(x['passed'] for x in checks),'failed':sum(not x['passed'] for x in checks),'data':'existing public XAUWar page, no real trading feed activated','account_or_message_writes':False},indent=2))
 (O/'runtime.log').write_bytes(adb('logcat','-d','-s','AndroidRuntime:E',check=False))
