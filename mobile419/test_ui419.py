"""Visual fixtures only; no real user account, backend writes or market prices."""
from pathlib import Path
import json,re,sys,urllib.parse,shutil
from playwright.sync_api import sync_playwright
BASE=Path(sys.argv[1]) if len(sys.argv)>1 else Path('android419')
A=BASE/'app/src/main/assets'; OUT=Path('quality419-ui');OUT.mkdir(exist_ok=True)
M=json.loads((A/'resources49-map.json').read_text()); M['/__android417/brand/logo.png']='brand417/logo.png'
checks=[];errors=[]
def check(name,ok):
 checks.append({'name':name,'passed':bool(ok)});print(('PASS ' if ok else 'FAIL ')+name,flush=True)
 if not ok:raise AssertionError(name)
def clean(s):return re.sub(r'<script\b[^>]*>.*?</script>','',s,flags=re.S|re.I)
art=[{'id':'fixture1','title':'Memahami pergerakan emas dengan konteks yang lebih jelas','category':'Emas','summary':'Konten simulasi untuk memeriksa desain berita. Bukan berita atau harga aktual.','status':'published','publishedAt':'2026-11-07T10:00:00Z','source':'Studio Marney • Uji tampilan','thumbnail':'/fixture-cover.svg'}, {'id':'fixture2','title':'Mengenal jadwal dan sesi perdagangan forex','category':'Forex','summary':'Artikel simulasi pengujian antarmuka.','status':'published','publishedAt':'2026-11-07T09:00:00Z','source':'Simulasi','thumbnail':'/fixture-cover.svg'}, {'id':'fixture3','title':'Membaca risiko aset kripto secara terukur','category':'Kripto','summary':'Artikel simulasi pengujian antarmuka.','status':'published','publishedAt':'2026-11-07T08:00:00Z','source':'Simulasi','thumbnail':'/fixture-cover.svg'}]
cover='<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="800" height="450" fill="#142a3d"/><path d="M0 340L120 300L220 325L330 220L440 250L550 150L650 175L800 80" fill="none" stroke="#edc27a" stroke-width="6"/><text x="46" y="90" font-family="sans-serif" font-size="24" fill="#edc27a">STUDIO MARNEY / SIMULASI</text><text x="46" y="130" font-family="sans-serif" font-size="16" fill="#adbdd1">Pengujian tampilan, bukan data pasar</text></svg>'
avatar='<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="18" fill="#5b6695"/><text x="32" y="43" text-anchor="middle" font-family="sans-serif" font-size="33" fill="white">Q</text></svg>'
def route(r):
 path=urllib.parse.urlsplit(r.request.url).path
 if path=='/api/content':r.fulfill(content_type='application/json',body=json.dumps({'articles':art}));return
 if path in ['/fixture-cover.svg','/user-avatar.svg']:r.fulfill(content_type='image/svg+xml',body=cover if 'cover' in path else avatar);return
 if path in M:
  p=A/M[path];data=p.read_bytes();mime='image/png' if p.suffix=='.png' else 'text/javascript' if p.suffix=='.js' else 'text/css' if p.suffix=='.css' else 'text/html'
  if p.suffix=='.html' and path!='/__android43/news':data=clean(data.decode()).encode()
  r.fulfill(content_type=mime,body=data);return
 if path.startswith('/api/'):r.fulfill(status=401,content_type='application/json',body='{"error":"Fixture: login tidak diuji"}');return
 r.abort()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=shutil.which('chromium') or shutil.which('google-chrome'),headless=True,args=['--no-sandbox'])
 try:
  for width in [320,412]:
   ctx=b.new_context(viewport={'width':width,'height':820},reduced_motion='reduce')
   page=ctx.new_page();page.route('**/*',route);page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto('https://marketmarney.com/__android43/news');page.wait_for_function("document.getElementById('count').textContent.includes('3 artikel')")
   check(f'{width} news loaded',page.locator('#list article').count()==3)
   check(f'{width} news brand local',page.locator('.mm417-news-title img').evaluate('i=>i.complete&&i.naturalWidth>0&&i.naturalHeight>0&&new URL(i.src).pathname==="/__android417/brand/logo.png"'))
   check(f'{width} no horizontal overflow news',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
   check(f'{width} news controls have names and touch targets',page.locator('#theme,#refresh,.save').evaluate_all('controls=>controls.length>2&&controls.every(e=>{const r=e.getBoundingClientRect();return r.width>=44&&r.height>=44&&(e.getAttribute("aria-label")||e.textContent).trim().length>0})'))
   page.locator('#search').fill('forex');check(f'{width} search works',page.locator('#list article').count()==1)
   page.locator('#search').fill('');page.locator('.save').first.click();page.get_by_role('button',name='Disimpan',exact=True).click();check(f'{width} saved filter',page.locator('#list article').count()==1)
   page.get_by_role('button',name='Semua',exact=True).click();page.locator('.toast').wait_for(state='hidden',timeout=6000)
   check(f'{width} loaded photo above fallback',page.locator('.cover img').first.evaluate('e=>Number(getComputedStyle(e).zIndex)>Number(getComputedStyle(e.parentElement.querySelector(".placeholder")).zIndex)'))
   page.screenshot(path=str(OUT/f'news-dark-{width}.png'))
   page.locator('#theme').click();check(f'{width} light theme',page.get_attribute('html','data-theme')=='light')
   check(f'{width} no horizontal overflow news light',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
   page.locator('#search').focus();page.keyboard.press('a');page.keyboard.press('Backspace')
   check(f'{width} search focus remains visible',page.locator('#search').evaluate('e=>document.activeElement===e&&getComputedStyle(e).outlineStyle!=="none"&&parseFloat(getComputedStyle(e).outlineWidth)>=1'))
   page.locator('#search').blur();page.screenshot(path=str(OUT/f'news-light-{width}.png'))
   page.goto('https://marketmarney.com/beranda-trader.html')
   page.evaluate('''() => {const $=id=>document.getElementById(id);$('shApp').hidden=false;$('shLogged').hidden=false;$('shGuest').hidden=true;$('shMessengerWrap').hidden=false;$('shNotificationWrap').hidden=false;$('shMessengerButton').onclick=()=>{$('shMessengerPane').hidden=false};$('shMsgClose').onclick=()=>{$('shMessengerPane').hidden=true};const f=document.querySelector('.sh-feed');f.innerHTML='<article class="sh-post"><header class="sh-post-header"><img class="sh-avatar" src="/user-avatar.svg"><div class="sh-post-meta"><a>Studio Marney</a><small style="display:block">Konten simulasi pengujian</small></div></header><p class="sh-post-body">Ruang untuk berbagi perspektif dan belajar memahami pasar.</p><img class="sh-post-image" src="/fixture-cover.svg" style="width:100%"><div class="sh-post-actions"><button>Suka</button><button>Komentar</button></div></article>';}''')
   page.evaluate((A/'social411/app.js').read_text());page.wait_for_selector('#mm44-social-header .mm44-nav-button',state='visible')
   check(f'{width} five social tabs',page.locator('#mm44-social-header .mm44-nav-button').count()==5)
   check(f'{width} social avatar unchanged',page.locator('.sh-post-header>.sh-avatar').get_attribute('src')=='/user-avatar.svg')
   check(f'{width} social logo fits',page.locator('.mm44-headrow .mm417-brand-image').first.evaluate('e=>{const r=e.getBoundingClientRect();return e.complete&&e.naturalWidth>0&&getComputedStyle(e).objectFit==="contain"&&r.width>0&&r.height>0&&r.left>=0&&r.right<=innerWidth+1}'))
   check(f'{width} no social overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
   check(f'{width} social navigation touch targets',page.locator('#mm44-social-header .mm44-nav-button').evaluate_all('links=>links.length===5&&links.every(e=>{const r=e.getBoundingClientRect();return r.width>=44&&r.height>=44&&(e.getAttribute("aria-label")||e.textContent).trim().length>0})'))
   page.screenshot(path=str(OUT/f'social-{width}.png'))
   page.locator('.mm44-nav-button[aria-label=Reels]').click();page.wait_for_timeout(180)
   check(f'{width} social header in reels',page.locator('#mm44-social-header').is_visible())
   check(f'{width} reels below header',page.locator('#shReelFeed').bounding_box()['y']>=page.locator('#mm44-social-header').bounding_box()['height']-1)
   page.locator('.mm44-nav-button[aria-label=Pesan]').click();page.wait_for_timeout(100)
   check(f'{width} messages open',page.locator('#shMessengerPane').is_visible())
   check(f'{width} header in messages',page.locator('#mm44-social-header').is_visible())
   page.goto('https://marketmarney.com/grup-trader.html?group=fixture')
   page.evaluate('''() => {const $=id=>document.getElementById(id);$('gmApp').hidden=false;$('gmApp').classList.add('room-open');$('gmRoom').hidden=false;$('gmEmpty').hidden=true;$('gmCompose').hidden=false;$('gmRoomName').textContent='Diskusi Pasar • Uji';$('gmRoomCount').textContent='Data simulasi';$('gmMessages').innerHTML='<article class="gm-msg"><strong>Studio Marney</strong><p>Pesan simulasi, bukan isi percakapan anggota.</p></article>';window.oldForm=$('gmCompose');}''')
   page.evaluate((A/'navigation47.js').read_text());page.wait_for_timeout(150)
   check(f'{width} group header five tabs',page.locator('#mm44-social-header .mm44-nav-button').count()==5)
   check(f'{width} compose preserved',page.evaluate('oldForm===document.getElementById("gmCompose")'))
   check(f'{width} group no overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
   page.screenshot(path=str(OUT/f'group-{width}.png'));ctx.close()
  check('No JavaScript errors in tested fixtures',not errors)
 finally:
  b.close();(OUT/'results.json').write_text(json.dumps({'checks':checks,'passed':sum(c['passed'] for c in checks),'failed':sum(not c['passed'] for c in checks),'errors':errors,'scope':'mock content/DOM, not real member messaging or upload'},indent=2))
