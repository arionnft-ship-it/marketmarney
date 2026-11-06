"""Exact debug APK via ADB/CDP; real WebView and website worker, synthetic account APIs."""
from pathlib import Path
import subprocess,time,json,urllib.request,websocket,re
O=Path('quality49-device');O.mkdir(exist_ok=True)
PKG='com.marketmarney.mobile.beta49';checks=[];seq=0;ws=None

def adb(*args,check=True):
 p=subprocess.run(['adb',*args],capture_output=True,timeout=60)
 if check and p.returncode:raise RuntimeError(p.stderr.decode(errors='replace')+p.stdout.decode(errors='replace'))
 return p.stdout

def record(name,ok):
 checks.append({'name':name,'passed':bool(ok)});print(('PASS: ' if ok else 'FAIL: ')+name,flush=True)
 if not ok:raise AssertionError(name)

def command(method,params=None):
 global seq
 seq+=1;ident=seq;ws.send(json.dumps({'id':ident,'method':method,'params':params or {}}))
 while True:
  obj=json.loads(ws.recv())
  if obj.get('id')==ident:
   if 'error' in obj:raise RuntimeError(obj['error'])
   return obj.get('result',{})

def ev(expression):
 r=command('Runtime.evaluate',{'expression':expression,'returnByValue':True,'awaitPromise':True})
 if r.get('exceptionDetails'):raise RuntimeError(r['exceptionDetails'])
 return r.get('result',{}).get('value')

def wait(expression,seconds=30):
 end=time.monotonic()+seconds;last=None
 while time.monotonic()<end:
  try:
   last=ev(expression)
   if last:return last
  except Exception as ex:last=str(ex)
  time.sleep(.4)
 raise RuntimeError('Condition timeout: '+expression+' '+str(last))

def screenshot(name):
 (O/(name+'.png')).write_bytes(adb('exec-out','screencap','-p'))
 (O/(name+'.txt')).write_text(str(ev('document.body.innerText')))

fixture=r"""(()=>{
 const realFetch=window.fetch.bind(window);window.__fixture49={deny:false,guest:false,calls:[],errors:[],resources:[]};
 window.addEventListener('error',e=>{if(e.message)__fixture49.errors.push(e.message);else if(e.target&&e.target.src&&e.target.src.includes('/__android'))__fixture49.resources.push(e.target.src);},true);
 const user={id:'synthetic-user',username:'qa49',displayName:'Akun Pengujian'};
 const profile={username:'qa49',displayName:'Akun Pengujian',avatarUrl:null,bio:'Data simulasi, bukan akun anggota.',postsCount:1,joinedAt:1793920000000,communityBadge:{},groupOwnerBadge:{}};
 function group(){return {id:'11111111-1111-4111-8111-111111111111',name:'Grup Uji 4.9',description:'Data simulasi',members:2,joined:!__fixture49.deny,role:__fixture49.deny?null:'member',visibility:'private',privacyRevision:1,canModerate:false,canEditPhoto:false,owner:'qa49',lastMessage:'Pesan sintetis',pinned:null};}
 window.fetch=async function(input,opts){let u=new URL(typeof input==='string'?input:input.url,location.href);if(u.origin!==location.origin||!u.pathname.startsWith('/api/'))return realFetch(input,opts);
 __fixture49.calls.push({path:u.pathname,method:opts&&opts.method||'GET'});
 await new Promise(r=>setTimeout(r,u.pathname==='/api/trader-profiles/me'?1200:80));
 let d={items:[],unread:0,counts:{},enabled:false},status=200;
 if(u.pathname==='/api/community/status'||u.pathname==='/api/community/me')d={user:__fixture49.guest?null:user,enabled:true};
 else if(u.pathname==='/api/trader-connect/groups')d={mine:[group()],discover:[]};
 else if(u.pathname==='/api/trader-connect/groups/detail')d={group:group()};
 else if(u.pathname==='/api/trader-connect/group-messages'){
  if(__fixture49.deny){status=403;d={error:'Akses dicabut — simulasi'};}
  else d={group:group(),members:[],items:Array.from({length:3},(_,i)=>({id:'m'+i,body:'Pesan sintetis '+i,username:'qa49',displayName:'Akun Pengujian',createdAt:1793920000000+i*1000,mine:false,canHide:false,groupRole:'member',reactions:{total:0,mine:null,counts:{}}}))};
 }
 else if(u.pathname==='/api/trader-profiles/public'||u.pathname==='/api/trader-profiles/me')d={profile,posts:[{id:'post1',username:'qa49',displayName:'Akun Pengujian',body:'Postingan simulasi untuk menguji menu Profil.',createdAt:1793920000000,comments:0}],user};
 else if(u.pathname==='/api/trader-follow/status')d={isSelf:true,loggedIn:true,followers:1,following:1,communityBadge:{},groupOwnerBadge:{}};
 return new Response(JSON.stringify(d),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 };
})();"""
try:
 adb('install','-r','apk/Marney49.apk');adb('shell','wm','size','480x900');adb('shell','wm','density','180');adb('logcat','-c')
 adb('shell','am','start','-W','-n',PKG+'/com.marketmarney.mobile.MainActivity')
 for _ in range(45):
  time.sleep(1)
  pid=adb('shell','pidof',PKG,check=False).decode().strip()
  sockets=adb('shell','cat','/proc/net/unix',check=False).decode(errors='replace')
  found=re.findall(r'@(webview_devtools_remote_\d+)',sockets)
  target=next((s for s in found if s.endswith('_'+pid)),None)
  if target:break
 else:raise RuntimeError('WebView debugging endpoint unavailable')
 adb('forward','tcp:9222','localabstract:'+target)
 for _ in range(20):
  try:
   pages=json.load(urllib.request.urlopen('http://127.0.0.1:9222/json',timeout=5))
   page=next(x for x in pages if x.get('type')=='page' and 'marketmarney.com' in x.get('url',''))
   break
  except Exception:time.sleep(1)
 ws=websocket.create_connection(page['webSocketDebuggerUrl'],timeout=40,suppress_origin=True)
 command('Page.enable');command('Runtime.enable')
 wait("location.hostname==='marketmarney.com' && document.readyState!=='loading'")
 ev("navigator.serviceWorker.register('/sw.js').then(()=>true)")
 wait('!!navigator.serviceWorker.controller',50)
 record('Actual website service worker controls Home',ev('!!navigator.serviceWorker.controller'))
 command('Page.addScriptToEvaluateOnNewDocument',{'source':fixture})
 command('Page.navigate',{'url':'https://marketmarney.com/grup-trader.html?group=11111111-1111-4111-8111-111111111111'})
 wait("document.querySelectorAll('#gmMessages .gm-msg').length===3")
 record('Member group loads after Home with active worker',ev('!!navigator.serviceWorker.controller'))
 record('Group has runtime-rendered mock messages',ev("document.getElementById('gmMessages').innerText.includes('Pesan sintetis 2')"))
 record('Five Social tabs remain',ev("document.querySelectorAll('#mm44-social-header .mm44-nav-button').length===5"))
 record('Group assets served locally through worker',ev("fetch('/__android48/group/navigation.css').then(r=>r.status===200&&r.headers.get('X-Marney-Asset')==='49')"))
 record('Group no local-resource errors',ev('__fixture49.resources.length===0'))
 record('Group no JavaScript exceptions',ev('__fixture49.errors.length===0'))
 screenshot('group-with-worker')
 ev("document.querySelector('#mm44-social-header [aria-label=Profil]').click()")
 wait("location.pathname==='/profil.html' && document.getElementById('mm36PublicHandle')?.textContent==='@qa49'")
 record('Group Profile opens account public profile',ev("new URL(location.href).searchParams.get('user')==='qa49'"))
 wait("document.querySelectorAll('#mm36PublicPosts .mm36-post').length===1 && !!document.getElementById('mm44-profile-header')")
 record('Profile styling and content rendered',ev("document.getElementById('mm36PublicName').textContent.includes('Akun Pengujian')"))
 record('Profile still has active worker',ev('!!navigator.serviceWorker.controller'))
 record('Profile no JS or local-resource errors',ev('__fixture49.errors.length===0&&__fixture49.resources.length===0'))
 screenshot('profile-with-worker')
 command('Page.navigate',{'url':'https://marketmarney.com/beranda-trader.html'})
 wait("!!document.getElementById('mm44-social-header') && !!window.MarneyProfile49")
 ev("document.getElementById('shPublicProfile').setAttribute('href','/profil.html');document.querySelector('.mm44-nav-button[aria-label=Profil]').click()")
 wait("location.pathname==='/profil.html' && document.getElementById('mm36PublicHandle')?.textContent==='@qa49'")
 record('Placeholder profile link resolves identity instead of blank profile',True)
 command('Page.navigate',{'url':'https://marketmarney.com/grup-trader.html?group=11111111-1111-4111-8111-111111111111'})
 wait("document.querySelectorAll('#gmMessages .gm-msg').length===3")
 ev("__fixture49.deny=true;window.dispatchEvent(new Event('mm45:resume'))")
 wait("document.getElementById('gmCompose').hidden&&document.querySelectorAll('#gmMessages .gm-msg').length===0")
 record('Revoked group access still clears private content',True)
 record('No JavaScript errors during denial',ev('__fixture49.errors.length===0'))
 log=adb('logcat','-d','-s','MM49_ASSET:I','AndroidRuntime:E',check=False).decode(errors='replace');(O/'native-assets.log').write_text(log)
 record('Native service-worker callback executes for group assets','worker /__android48/group/' in log)
 record('Native worker callback handles profile resources','worker /__android49/profile/' in log)
 record('No fatal application exception',('Process: '+PKG) not in log)
 record('Process remains alive',bool(adb('shell','pidof',PKG,check=False).strip()))
finally:
 if ws:
  try:ws.close()
  except Exception:pass
 (O/'results.json').write_text(json.dumps({'checks':checks,'passed':sum(x['passed'] for x in checks),'failed':sum(not x['passed'] for x in checks),'service_worker':'real public website worker on Android 15','account_data':'synthetic test-only CDP fetch fixtures','real_login_or_messages_sent':False},indent=2))
 try:(O/'final-log.txt').write_bytes(adb('logcat','-d','-s','MM49_ASSET:I','AndroidRuntime:E','chromium:E',check=False))
 except Exception:pass
