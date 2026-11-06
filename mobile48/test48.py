"""Real browser, original group runtime, simulated accounts/network. No production writes."""
import asyncio,json,re,statistics,time,copy,hashlib
from pathlib import Path
from urllib.parse import urlsplit,parse_qs
from playwright.async_api import async_playwright
A=Path('android43/app/src/main/assets');B=Path('baseline48');O=Path('quality48');O.mkdir(exist_ok=True)
ID='11111111-1111-4111-8111-111111111111';ID2='22222222-2222-4222-8222-222222222222'
raw=json.loads((B/'assets.json').read_text());mapping=json.loads((A/'group48-map.json').read_text())
checks=[];bench=[];errors=[]
def check(name,ok):
 checks.append({'name':name,'passed':bool(ok)});print(('PASS: ' if ok else 'FAIL: ')+name,flush=True)
 if not ok:raise AssertionError(name)
def group(gid=ID):return {'id':gid,'name':'Ruang Uji Performa' if gid==ID else 'Grup Kedua','description':'Konten sintetis, bukan data pengguna.','members':2,'joined':True,'role':'member','visibility':'private','privacyRevision':1,'canModerate':False,'canEditPhoto':False,'owner':'uji','lastMessage':'Pesan uji','pinned':None}
def messages(gid=ID):return [{'id':'m'+str(i),'body':'Pesan uji '+str(i),'username':'uji','displayName':'Akun Simulasi','createdAt':1793920000000+i*1000,'mine':False,'canHide':False,'groupRole':'member','reactions':{'total':0,'mine':None,'counts':{}}} for i in range(120)]
class Fixture:
 def __init__(self,optimized=True,delay=0.16,list_delay=0.55,user=True):
  self.optimized=optimized;self.delay=delay;self.list_delay=list_delay;self.calls=[];self.user=user;self.deny=False;self.expired=False;self.rows=messages();self.posts=0;self.page=None;self.ctx=None
 async def route(self,r):
  u=urlsplit(r.request.url);p=u.path;q=parse_qs(u.query);method=r.request.method
  if p.startswith('/api/'):
   self.calls.append({'path':p,'method':method,'ms':round(time.monotonic()*1000)})
   await asyncio.sleep(self.list_delay if p=='/api/trader-connect/groups' else self.delay)
   status=200;data={}
   if p=='/api/community/status':data={'user':{'id':'test-user','username':'uji','displayName':'Akun Simulasi'} if self.user else None,'enabled':True}
   elif p=='/api/trader-connect/groups':data={'mine':[group(),group(ID2)],'discover':[]}
   elif p=='/api/trader-connect/groups/detail':
    g=group(q.get('id',[ID])[0]);data={'group':dict(g,joined=False,removed=True,role=None) if self.deny else g}
   elif p=='/api/trader-connect/group-messages':
    if self.expired:status=401;data={'error':'Sesi berakhir.'}
    elif self.deny:status=403;data={'error':'Akses grup dicabut.'}
    elif method=='POST':
     self.posts+=1;data={'ok':True};self.rows=self.rows[1:]+[dict(messages()[0],id='sent',mine=True,body='Pesan uji terkirim')]
    else:data={'group':group(q.get('id',[ID])[0]),'items':copy.deepcopy(self.rows),'members':[]}
   elif p.endswith('/groups/members'):data={'items':[],'nextOffset':0,'hasMore':False,'total':0}
   elif p.endswith('/status'):data={'user':{'username':'uji'} if self.user else None,'items':[],'total':0}
   else:data={'items':[],'unread':0,'counts':{},'enabled':False}
   try:await r.fulfill(status=status,content_type='application/json',body=json.dumps(data))
   except Exception:pass
   return
  if p=='/grup-trader.html':
   h=(A/'group48/page.html').read_text() if self.optimized else (B/'group.html').read_text()
   # Same accepted APK styling/navigation on the baseline as on optimized pages.
   if not self.optimized:h=h.replace('</head>','<link rel="stylesheet" href="/__android48/group/navigation.css"><script defer src="/__android48/group/navigation.js"></script></head>')
   await r.fulfill(content_type='text/html',body=h);return
  if p in mapping:
   data=(A/mapping[p]).read_text();await r.fulfill(content_type='text/css' if p.endswith('.css') else 'text/javascript',body=data);return
  if p in raw:await r.fulfill(content_type='text/css' if p.endswith('.css') else 'text/javascript',body=raw[p]);return
  if p.endswith(('.png','.webp','.jpg','.svg')):
   await r.fulfill(content_type='image/svg+xml',body='<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36"/>');return
  await r.fulfill(status=404,body='Fixture resource unavailable')
 async def start(self,browser,direct=True):
  self.ctx=await browser.new_context(viewport={'width':412,'height':800});self.page=await self.ctx.new_page();await self.page.route('**/*',self.route)
  self.page.on('pageerror',lambda e:errors.append(str(e)))
  t=time.monotonic();await self.page.goto('https://marketmarney.com/grup-trader.html'+('?group='+ID if direct else ''),wait_until='domcontentloaded')
  if self.user and not self.deny:
   await self.page.wait_for_selector('#gmMessages .gm-msg',timeout=12000)
  return round((time.monotonic()-t)*1000,1)
 async def close(self):await self.ctx.close()
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  try:
   for direct in [True,False]:
    samples={False:[],True:[]}
    for optimized in [False,True]:
     for repeat in range(3):
      f=Fixture(optimized);elapsed=await f.start(b,direct);samples[optimized].append(elapsed)
      check(f'{direct}/{optimized}/{repeat}: 120 real runtime rows rendered',await f.page.locator('#gmMessages .gm-msg').count()==120)
      if optimized:check(f'{direct}/{repeat}: no redundant detail request',not any(c['path'].endswith('/groups/detail') for c in f.calls))
      if repeat==2:
       await f.page.wait_for_timeout(700)
       await f.page.screenshot(path=str(O/(('after' if optimized else 'before')+('-direct' if direct else '-list')+'.png')))
      await f.close()
    before=statistics.median(samples[False]);after=statistics.median(samples[True]);bench.append({'scenario':'direct group' if direct else 'group list then first room','baseline_ms':before,'optimized_ms':after,'baseline_samples':samples[False],'optimized_samples':samples[True],'simulated_api_delay_ms':160,'simulated_list_delay_ms':550})
    check(('Direct' if direct else 'List')+': median improved under same simulated latency',after<before)
   f=Fixture(True,delay=.05,list_delay=.08);await f.start(b);pg=f.page
   await pg.wait_for_timeout(200)
   check('Five top Social destinations retained',await pg.locator('#mm44-social-header .mm44-nav-button').count()==5)
   check('Private messages not persisted by optimizer',not re.search(r'localStorage|sessionStorage|indexedDB', (B/'runtime-after.js').read_text().replace("localStorage.getItem('mm1839-last-theme')",'')))
   await pg.evaluate("window.firstRow48=document.querySelector('#gmMessages .gm-msg')")
   f.rows[-1]['body']='Hanya pesan terakhir berubah';await pg.evaluate("window.dispatchEvent(new Event('mm45:resume'))")
   await pg.wait_for_selector('#gmMessages .gm-msg:last-child:has-text("Hanya pesan terakhir berubah")')
   check('Unchanged message node preserved',await pg.evaluate("firstRow48===document.querySelector('#gmMessages .gm-msg')"))
   check('Still 120 messages after update',await pg.locator('#gmMessages .gm-msg').count()==120)
   await pg.locator('#gmMessages .gm-msg').first.get_by_role('button',name='Balas pesan Akun Simulasi',exact=True).click()
   check('Existing reply handler preserved',await pg.locator('#gmReplyContext').is_visible())
   await pg.locator('#gmReplyCancel').click()
   await pg.locator('#gmBody').fill('Pesan uji terkirim');await pg.locator('#gmSend').click()
   await pg.wait_for_selector('#gmMessages .gm-msg:last-child:has-text("Pesan uji terkirim")')
   check('Existing send handler issues exactly one mock POST',f.posts==1)
   f.deny=True;await pg.evaluate("window.dispatchEvent(new Event('mm45:resume'))")
   await pg.wait_for_function("document.getElementById('gmCompose').hidden&&document.querySelectorAll('#gmMessages .gm-msg').length===0")
   check('Revoked membership removes messages and composer',await pg.locator('#gmMessages .gm-msg').count()==0)
   await f.close()
   f=Fixture(True,delay=.05,list_delay=.8);f.deny=True;await f.start(b);await f.page.wait_for_timeout(1100)
   check('Stale sidebar cannot grant denied membership',await f.page.locator('#gmMessages .gm-msg').count()==0 and not await f.page.locator('#gmCompose').is_visible());await f.close()
   f=Fixture(True,delay=.05,list_delay=.1);await f.start(b);f.expired=True;await f.page.evaluate("window.dispatchEvent(new Event('mm45:resume'))")
   await f.page.wait_for_selector('#gmGuest',state='visible');check('Session expiry clears private messages',await f.page.locator('#gmMessages .gm-msg').count()==0);await f.close()
   f=Fixture(True,delay=.1,list_delay=.1,user=False);await f.start(b);await f.page.wait_for_selector('#gmGuest',state='visible')
   check('Guest cannot fetch group messages',not any(c['path'].endswith('/group-messages') for c in f.calls));await f.close()
   check('No API path bundled into APK',all(not k.startswith('/api/') for k in mapping))
   check('No browser JS errors',not errors)
  finally:
   await b.close();(O/'results.json').write_text(json.dumps({'checks':checks,'passed':sum(x['passed'] for x in checks),'failed':sum(not x['passed'] for x in checks),'benchmark':bench,'browser_errors':errors,'real_accounts_used':False,'actual_phone_performance_measured':False,'network':'API latency simulated, not an internet speed measurement'},indent=2))
if __name__=='__main__':asyncio.run(main())
