"""Read-only navigation fixtures. No real login or chat/reaction requests."""
from pathlib import Path
import re,json,urllib.request,shutil
from playwright.sync_api import sync_playwright
A=Path('android43/app/src/main/assets');OUT=Path('quality47');OUT.mkdir(exist_ok=True);checks=[];errors=[]
def get(path):
 with urllib.request.urlopen('https://marketmarney.com'+path,timeout=25) as r:return r.read(1500000).decode()
def prepare(path):
 raw=get(path);css=''
 for href in re.findall(r'<link[^>]+href="([^"]+)"',raw):
  if '.css' in href and href.startswith('/'):
   try:css+='\n'+get(href)
   except Exception:pass
 return re.sub(r'<link\b[^>]*>','',re.sub(r'<script\b[^>]*>.*?</script>','',raw,flags=re.S|re.I),flags=re.I),css
social,sc=prepare('/beranda-trader.html');group,gc=prepare('/grup-trader.html')
appcss='\n'.join((A/n).read_text() for n in ['social44.css','reels46.css','navigation47.css'])
js=[(A/n).read_text() for n in ['social44.js','reels46.js','navigation47.js']]
setup="""() => {
 const $=id=>document.getElementById(id);$('shApp').hidden=false;$('shGuest').hidden=true;$('shLogged').hidden=false;$('shMessengerWrap').hidden=false;$('shNotificationWrap').hidden=false;
 $('shMessengerButton').onclick=()=>{$('shMessengerPane').hidden=false};$('shMsgClose').onclick=()=>{$('shMessengerPane').hidden=true};
 const f=$('shReelFeed');f.innerHTML='';
 for(let i=0;i<3;i++){
 const a=document.createElement('article');a.className='sh-reel-card';a.dataset.reelId='fixture-'+i;
 a.innerHTML='<div class="sh-reel-stage"><video class="sh-reel-video" src="https://marketmarney.com/test.mp4"></video><div class="sh-reel-overlay" role="button" tabindex="0"><div class="sh-reel-bottom"><div class="sh-reel-author">Studio Marney • UJI TAMPILAN</div><p class="sh-reel-caption">Menu Social tetap tersedia di atas Reels. Konten simulasi untuk pengujian navigasi.</p></div></div><div class="sh-reel-rail"><button class="sh-reel-rail-btn"><span class="sh-reel-rail-icon">♡</span><strong>0</strong><small>Suka</small></button></div></div>';f.append(a);
 }
 Object.defineProperty(HTMLMediaElement.prototype,'paused',{configurable:true,get(){return this._paused!==false}});
 HTMLMediaElement.prototype.play=function(){this._paused=false;this.dispatchEvent(new Event('play'));return Promise.resolve()};
 HTMLMediaElement.prototype.pause=function(){if(this._paused!==true){this._paused=true;this.dispatchEvent(new Event('pause'))}};
 HTMLMediaElement.prototype.load=function(){};
}"""
def openpage(page,path,html,css):
 page.route('**/*',lambda r:r.fulfill(content_type='text/html',body=html) if r.request.resource_type=='document' else r.abort());page.goto('https://marketmarney.com'+path)
 page.add_style_tag(content=css+'\n'+appcss)
def check(name,ok):
 checks.append({'name':name,'passed':bool(ok)});print(('PASS ' if ok else 'FAIL ')+name,flush=True)
 if not ok:raise AssertionError(name)
def bar(page,label):
 nav=page.locator('#mm44-social-header .mm44-nav');check(label+': five labels',nav.locator('.mm44-nav-button').count()==5)
 check(label+': pinned top',abs(page.locator('#mm44-social-header').bounding_box()['y'])<2)
 for text in ['Linimasa','Reels','Pesan','Jelajah','Profil']:
  q=nav.locator('[aria-label="'+text+'"]');check(label+': '+text+' visible and touchable',q.is_visible() and q.evaluate('(e)=>{const r=e.getBoundingClientRect();return r.width>35&&r.height>=44&&e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}'))
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=shutil.which('chromium') or shutil.which('google-chrome'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 try:
  for w in [360,412]:
   c=b.new_context(viewport={'width':w,'height':760});page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
   openpage(page,'/beranda-trader.html',social,sc);page.evaluate(setup)
   for s in js:page.evaluate(s)
   page.wait_for_timeout(160);page.locator('.mm44-nav-button[aria-label=Reels]').click();page.wait_for_timeout(220);bar(page,f'{w} Reels')
   h=page.locator('#mm44-social-header').bounding_box();stage=page.locator('#shReelFeed').bounding_box()
   check(f'{w}: Reels below header',stage['y']>=h['y']+h['height']-1)
   check(f'{w}: Reels fits remaining height',abs(stage['y']+stage['height']-760)<=2)
   check(f'{w}: snap cards fit',abs(page.locator('.sh-reel-card').first.bounding_box()['height']-stage['height'])<=2)
   page.screenshot(path=str(OUT/f'reels-{w}.png'))
   page.locator('#shReelFeed').evaluate('e=>e.scrollTop=e.clientHeight');page.wait_for_timeout(160);bar(page,f'{w} scrolled Reels')
   page.locator('.mm44-nav-button[aria-label=Pesan]').click();page.wait_for_timeout(160);bar(page,f'{w} messages')
   pane=page.locator('#shMessengerPane').bounding_box();h=page.locator('#mm44-social-header').bounding_box();check(f'{w}: messages below header',pane['y']>=h['height']-1)
   page.set_viewport_size({'width':w,'height':400});page.wait_for_timeout(160);bar(page,f'{w} reduced viewport');page.screenshot(path=str(OUT/f'messages-keyboard-{w}.png'))
   page.locator('.mm44-nav-button[aria-label=Linimasa]').click();check(f'{w}: feed can reopen',page.get_attribute('html','data-mm44-view')=='feed')
   check(f'{w}: leaving Reels pauses players',page.locator('.sh-reel-video').evaluate_all('(vs)=>vs.every(v=>v.paused)'))
   page.evaluate(js[-1]);check(f'{w}: no duplicate header',page.locator('#mm44-social-header').count()==1);c.close()
   c=b.new_context(viewport={'width':w,'height':760});page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
   openpage(page,'/grup-trader.html?group=test-only',group,gc)
   page.evaluate("""() => {const $=id=>document.getElementById(id);$('gmApp').hidden=false;$('gmApp').classList.add('room-open');$('gmRoom').hidden=false;$('gmEmpty').hidden=true;$('gmCompose').hidden=false;$('gmRoomName').textContent='Grup uji tampilan';$('gmMessages').innerHTML=Array.from({length:15},(_,i)=>'<article class="gm-msg">Pesan simulasi '+i+' — pengujian navigasi.</article>').join('');window.originalCompose=$('gmCompose');} """)
   for s in js:page.evaluate(s)
   page.wait_for_timeout(220);bar(page,f'{w} group')
   h=page.locator('#mm44-social-header').bounding_box();room=page.locator('#gmRoom').bounding_box();check(f'{w}: group below header',room['y']>=h['height']-1)
   check(f'{w}: existing composer preserved',page.evaluate("originalCompose===document.getElementById('gmCompose')"))
   check(f'{w}: group selected under Pesan',page.locator('.mm44-nav-button[aria-label=Pesan]').get_attribute('aria-current')=='page')
   check(f'{w}: Reels destination retained',page.locator('a.mm44-nav-button[aria-label=Reels]').get_attribute('href')=='/beranda-trader.html#mm44-reels')
   check(f'{w}: message destination retained',page.locator('a.mm44-nav-button[aria-label=Pesan]').get_attribute('href')=='/beranda-trader.html#mm44-messages')
   page.screenshot(path=str(OUT/f'group-{w}.png'));page.locator('#gmMessages').evaluate('e=>e.scrollTop=e.scrollHeight');bar(page,f'{w} scrolled group')
   page.set_viewport_size({'width':w,'height':400});page.wait_for_timeout(220);bar(page,f'{w} group reduced viewport')
   co=page.locator('#gmCompose').bounding_box();check(f'{w}: composer in reduced viewport',co['y']+co['height']<=402)
   page.screenshot(path=str(OUT/f'group-keyboard-{w}.png'));c.close()
  c=b.new_context();page=c.new_page();openpage(page,'/beranda-trader.html#mm44-reels',social,sc);page.evaluate(setup);page.evaluate("document.getElementById('shLogged').hidden=true")
  for s in js:page.evaluate(s)
  check('Pending session does not redirect to login','/akun.html' not in page.url)
  page.evaluate("document.getElementById('shLogged').hidden=false");page.wait_for_timeout(160);check('Reels route applied after session',page.get_attribute('html','data-mm44-view')=='reels');c.close()
  check('No JavaScript errors in tested pages',not errors)
 finally:
  b.close();(OUT/'results.json').write_text(json.dumps({'checks':checks,'passed':sum(x['passed'] for x in checks),'failed':sum(not x['passed'] for x in checks),'errors':errors,'account_and_media_simulated':True,'real_login_messages_tested':False},indent=2))
