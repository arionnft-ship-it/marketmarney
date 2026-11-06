"""Actual synthetic MP4 playback against routed fixture pages; no real accounts or writes."""
from pathlib import Path
import urllib.request,json,re,shutil
from playwright.sync_api import sync_playwright
ROOT=Path.cwd();A=ROOT/'android43/app/src/main/assets';OUT=ROOT/'quality46';OUT.mkdir(exist_ok=True)
old=(ROOT/'mobile43/test_ui.py').read_text();g={};exec(old[old.index("social_fixture='''"):old.index('\nwith sync_playwright()')],g);html=g['social_fixture']
html=html.replace('<form class="sh-reel-form">','<form id="shReelForm" class="sh-reel-form">').replace('<article class="sh-reel-card">Reel fixture</article>','')
html=html.replace('</body>','<dialog id="shVideoCommentsDialog"><h2>Komentar Reels</h2><button id="closeComments">Tutup komentar</button></dialog></body>')
def get(p):
 req=urllib.request.Request('https://marketmarney.com'+p,headers={'User-Agent':'MarneyReadOnlyMediaTest/4.6'})
 with urllib.request.urlopen(req,timeout=30) as r:return r.read().decode()
server=get('/assets/social-home-1846.js');basecss=get('/assets/social-home-1846.css')
real=server[server.index('function reelMetrics'):server.index('async function loadReels')]
setup="""const connectState={};window.mockApiCalls=[];
const $=id=>document.getElementById(id),el=(t,c,s)=>{let n=document.createElement(t);if(c)n.className=c;if(s!==undefined)n.textContent=s;return n;};
function formatVideoStat(x){return x===null?'—':String(x)}function nameOf1873(x){return x.username}function date(){return 'SIMULASI PENGUJIAN'}function setAvatar(n){n.textContent='M';}function reelStatus(t){window.fixtureStatus=t;}
async function vApi(path,method,data){mockApiCalls.push({path,method,data});return {liked:path==='like',likes:1,comments:0,views:0};}
async function openVideoComments(kind,item){window.openedComment=item.id;$('shVideoCommentsDialog').showModal();}
async function cApi(){throw Error('Writes unavailable in fixture')}
$('closeComments').onclick=()=>$('shVideoCommentsDialog').close();
"""+real+"""
for(let i=0;i<6;i++)$('shReelFeed').append(reelCard({id:'test-'+i,username:'studio.marney (uji)',videoUrl:'https://marketmarney.com/test-video.mp4?id='+i,caption:'Membaca momentum pasar dengan lebih tenang. Video ini hanya data simulasi pengujian tampilan dan pemutar, bukan rekomendasi transaksi.',createdAt:'2026-11-06',own:false,videoStats:{liked:false,likes:0,comments:0,views:0}}));bindReelObserver();
"""
css=basecss+(A/'social44.css').read_text()+(A/'reels46.css').read_text();js=(A/'social44.js').read_text();reels=(A/'reels46.js').read_text();video=(ROOT/'test-video.mp4').read_bytes();checks=[];errors=[]
def check(name,ok):
 checks.append({'name':name,'passed':bool(ok)});print(('PASS: ' if ok else 'FAIL: ')+name,flush=True)
 if not ok:raise AssertionError(name)
def route(r):
 u=r.request.url
 if '/test-video.mp4' in u:
  a=0;b=len(video)-1;m=re.search(r'bytes=(\d+)-(\d*)',r.request.headers.get('range',''))
  if m:a=int(m[1]);b=min(int(m[2]) if m[2] else b,b)
  headers={'Content-Type':'video/mp4','Accept-Ranges':'bytes','Cache-Control':'public,max-age=600'}
  if m:headers['Content-Range']=f'bytes {a}-{b}/{len(video)}'
  r.fulfill(status=206 if m else 200,body=video[a:b+1],headers=headers)
 elif '/beranda-trader.html' in u:r.fulfill(content_type='text/html',body=html)
 else:r.abort()
def mount(page,guest=False):
 page.goto('https://marketmarney.com/beranda-trader.html');page.add_style_tag(content=css)
 if guest:page.evaluate("document.getElementById('shLogged').hidden=true;document.getElementById('shGuest').hidden=false")
 page.evaluate(setup);page.evaluate(js);page.evaluate(reels)
def playing(page):return page.evaluate("Array.from(document.querySelectorAll('.sh-reel-video')).filter(v=>!v.paused).length")
with sync_playwright() as p:
 opts={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']}
 exe=shutil.which('google-chrome') or shutil.which('chromium')
 if exe:opts['executable_path']=exe
 b=p.chromium.launch(**opts)
 try:
  for w in [360,412]:
   c=b.new_context(viewport={'width':w,'height':760});page=c.new_page();page.route('**/*',route);page.on('pageerror',lambda e:errors.append(str(e)));mount(page)
   page.get_by_role('button',name='Reels',exact=True).click();page.wait_for_selector('html[data-mm46-reels]')
   page.wait_for_function("Array.from(document.querySelectorAll('.sh-reel-video')).some(v=>!v.paused&&v.currentTime>0.1)",timeout=10000)
   check(f'{w}: actual video playing',playing(page)==1)
   check(f'{w}: muted by default',page.locator('.sh-reel-video').first.evaluate('v=>v.muted'))
   check(f'{w}: full viewport',page.locator('#shReelFeed').bounding_box()['height']==760)
   check(f'{w}: snap mandatory',page.locator('#shReelFeed').evaluate('e=>getComputedStyle(e).scrollSnapType')=='y mandatory')
   check(f'{w}: no overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
   check(f'{w}: at most two media URLs',page.locator('.sh-reel-video[src]').count()<=2)
   page.screenshot(path=str(OUT/f'reels-{w}.png'))
   page.locator('[data-mm46-action=like]').first.click();page.wait_for_timeout(100)
   check(f'{w}: existing like callback',page.evaluate("mockApiCalls.filter(c=>c.path==='like').length")==1)
   page.locator('[data-mm46-action=comment]').first.click();page.wait_for_timeout(200)
   check(f'{w}: original comments dialog',page.locator('#shVideoCommentsDialog').is_visible())
   check(f'{w}: pauses behind comments',playing(page)==0);page.locator('#closeComments').click()
   page.locator('#shReelFeed').evaluate('e=>e.scrollTo({top:e.clientHeight,behavior:"instant"})');page.wait_for_timeout(800)
   check(f'{w}: next item selected',page.locator('[data-mm46-active]').get_attribute('data-reel-id')=='test-1')
   check(f'{w}: previous item paused',page.locator('.sh-reel-video').first.evaluate('v=>v.paused'))
   check(f'{w}: at most one player',playing(page)<=1)
   check(f'{w}: source budget retained',page.locator('.sh-reel-video[src]').count()<=2)
   page.evaluate("window.__mm45Suspended=true;window.dispatchEvent(new Event('mm45:suspend'))");page.wait_for_timeout(100)
   check(f'{w}: pauses when tab hidden',playing(page)==0)
   page.evaluate("window.__mm45Suspended=false;window.dispatchEvent(new Event('mm45:resume'))")
   page.get_by_role('button',name='Pengaturan Reels',exact=True).click();page.locator('#mm46-options input').check();page.screenshot(path=str(OUT/f'settings-{w}.png'));page.get_by_role('button',name='Tutup pengaturan').click()
   page.locator('#shReelFeed').evaluate('e=>e.scrollTo({top:e.clientHeight*2,behavior:"instant"})');page.wait_for_timeout(500)
   check(f'{w}: data saver disables autoplay',playing(page)==0)
   check(f'{w}: no next video prefetch in saver',page.locator('.sh-reel-video[src]').count()==1)
   page.locator('[data-mm46-active] .sh-reel-overlay').click(position={'x':90,'y':190});page.wait_for_timeout(350)
   check(f'{w}: manual play works in saver',playing(page)==1)
   page.locator('[data-mm46-active] .sh-reel-overlay').click(position={'x':90,'y':190});page.wait_for_timeout(100)
   check(f'{w}: tap pauses video',playing(page)==0)
   page.evaluate(reels);check(f'{w}: idempotent toolbar',page.locator('#mm46-toolbar').count()==1)
   page.get_by_role('button',name='Kembali ke linimasa').click();page.wait_for_timeout(100)
   check(f'{w}: returns to feed',page.get_attribute('html','data-mm44-view')=='feed')
   check(f'{w}: detached offscreen sources',page.locator('.sh-reel-video[src]').count()==0)
   check(f'{w}: no JS errors',not errors);c.close()
  c=b.new_context(reduced_motion='reduce');page=c.new_page();page.route('**/*',route);mount(page);page.get_by_role('button',name='Reels',exact=True).click();page.wait_for_timeout(200)
  check('Reduced motion disables automatic playback',playing(page)==0);c.close()
  c=b.new_context();page=c.new_page();page.route('**/*',route);mount(page,True)
  check('Guest does not enter fullscreen',page.get_attribute('html','data-mm46-reels') is None)
  check('Guest media released',page.locator('.sh-reel-video[src]').count()==0);c.close()
  c=b.new_context();page=c.new_page();page.set_content(html);page.evaluate(reels);check('Reject untrusted origin',page.locator('#mm46-toolbar').count()==0);c.close()
 finally:
  b.close();(OUT/'results.json').write_text(json.dumps({'checks':checks,'passed':sum(x['passed'] for x in checks),'failed':sum(not x['passed'] for x in checks),'errors':errors,'video':'actual synthetic MP4 playback','api':'mock only; no real login/comments/uploads tested'},indent=2))
