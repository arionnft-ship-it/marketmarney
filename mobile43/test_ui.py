"""UI regression tests use synthetic fixtures, never real accounts or posts."""
from pathlib import Path
from datetime import datetime, timezone, timedelta
import json, re, urllib.request
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent
OUT=Path('quality43');OUT.mkdir(exist_ok=True)
BASE='https://marketmarney.com'
checks=[]
def check(name, condition):
    if not condition: raise AssertionError(name)
    checks.append(name);print('PASS:',name,flush=True)

def get_public(path):
    req=urllib.request.Request(BASE+path,headers={'User-Agent':'MarketMarneyUIReview/4.3'})
    with urllib.request.urlopen(req,timeout=25) as r:
        if r.status!=200:raise RuntimeError(f'{path} HTTP {r.status}')
        return r.read().decode('utf-8')

# Read-only smoke checks. No backup/deployment/auth/user-data mutations.
try:
    social_live=get_public('/beranda-trader.html')
    for name in ['shApp','shFeed','shStories','shReelsPanel','shComposer','shGuest']:
        check('Live social selector '+name, bool(re.search(r'id=["\']'+name+r'["\']',social_live)))
    live_content=json.loads(get_public('/api/content'))
    check('Live public articles schema', isinstance(live_content.get('articles'),list))
    (OUT/'live-readonly-status.json').write_text(json.dumps({'social_selectors':True,'published_article_count':len(live_content['articles']),'login_tested':False},indent=2))
except Exception as e:
    (OUT/'live-readonly-status.json').write_text(json.dumps({'live_read_check':'unavailable','reason':str(e),'login_tested':False},indent=2))
    print('NOTE: live read check unavailable:',e,flush=True)

articles=[]
for i in range(18):
    cat=['Emas','Forex','Kripto','Saham','Ekonomi'][i%5]
    articles.append({'id':f'test-{i}','title':f'{cat}: contoh artikel pengujian nomor {i+1}', 'cat':cat,'status':'published','desc':'Data sintetis untuk pengujian tata letak, bukan berita pasar.','date':(datetime(2026,11,6,tzinfo=timezone.utc)-timedelta(hours=i)).isoformat()})
articles.append({'id':'draft-private','title':'Draft should not appear','cat':'Emas','status':'draft'})
news=(ROOT/'assets/news43.html').read_text()
css=(ROOT/'assets/social43.css').read_text()
js=(ROOT/'assets/social43.js').read_text()

social_fixture='''<!doctype html><html lang="id" data-trader-theme="dark"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
:root{--bg:#08121e;--panel:#102334;--panel2:#162b3b;--text:#eff5fa;--muted:#9eb4c4;--border:#263e50;--amber:#f4bc3e;font-family:Arial,sans-serif;color:var(--text)}*{box-sizing:border-box}body{margin:0}button{cursor:pointer}a{color:inherit;text-decoration:none}[hidden]{display:none!important}.sh-avatar{display:grid;place-items:center;border-radius:50%;background:#25465c;width:42px;height:42px;flex:none}.sh-post-header{display:flex;align-items:center}.sh-post-meta{flex:1}.sh-post-meta time{display:block}.sh-story-avatar{position:absolute}.sh-stories{display:flex;overflow-x:auto}.sh-story-tile,.sh-story-add{position:relative}.sh-story-add-icon{position:absolute;display:grid;place-items:center}.sh-story-tile strong{position:absolute}.sh-story-dialog{border:1px solid var(--border);background:var(--panel);color:var(--text);padding:20px;max-width:95vw}.sh-modal-box{display:grid;gap:12px}.sh-modal-head{display:flex;align-items:center;justify-content:space-between}.sh-primary{padding:14px;background:var(--amber);color:#111;border:0;border-radius:10px}.sh-primary-link{padding:14px;background:var(--amber);color:#111}.sh-quick{display:flex}.sh-quick button{flex:1;background:none;border:0}.sh-compose-head{display:flex;gap:10px}.sh-compose-open{flex:1;border-radius:25px;border:1px solid var(--border)}.sh-feedbar{display:flex;align-items:center;justify-content:space-between}.sh-feedbar select{background:var(--panel);color:var(--text);border:0;padding:6px}.sh-post-actions button{background:none;border:0}.sh-countrow{display:flex;justify-content:space-between}.sh-post-options{background:none;border:0;color:inherit}input,textarea{font:inherit}.sh-top-search{display:flex;padding:9px;gap:8px}.sh-top-search input{background:none;border:0;width:100%}.sh-msg-button,.sh-notice-bell{background:none;color:inherit;border:0;font-size:22px}.sh-msg-pane,.sh-notice-pane{background:var(--panel);padding:15px}.sh-post-photo{aspect-ratio:4/3;background:linear-gradient(130deg,#264954,#12233c)}
</style></head><body>
<header class="sh-topbar"><div class="sh-top-search"><input id="shSearch" placeholder="Cari trader, grup atau postingan"><div id="shSearchResults" hidden></div></div><div id="shMessengerWrap" class="sh-messenger-wrap"><button id="shMessengerButton" class="sh-msg-button" aria-label="Pesan">✉</button><section id="shMessengerPane" class="sh-msg-pane" hidden>Pesan pengujian</section></div><div id="shNotificationWrap" class="sh-notice-wrap"><button id="shNotificationBell" class="sh-notice-bell" aria-label="Notifikasi">♡</button></div><button data-sh-theme="light">Light</button><button data-sh-theme="dark">Dark</button></header>
<main class="sh-layout" id="shApp"><aside class="sh-left">Old sidebar</aside><section class="sh-center"><section class="sh-panel sh-guest" id="shGuest" hidden><h1>Guest</h1><p>Guest text</p><a href="/akun.html">Login</a></section><div id="shLogged"><section class="sh-welcome">Old welcome</section><section class="sh-story-section sh-panel"><div class="sh-section-title">Stories</div><div class="sh-stories" id="shStories"><button class="sh-story-add"><span class="sh-story-add-icon">＋</span><strong>Buat Story</strong><small>Story</small></button>''' + ''.join(f'<button class="sh-story-tile"><div class="sh-story-cover"></div><div class="sh-avatar sh-story-avatar">{n[:2]}</div><strong>{n}</strong></button>' for n in ['Trader A','Trader B','Trader C','Trader D']) + '''</div></section><details id="shReelsPanel"><summary>Reels</summary><form class="sh-reel-form"><input id="shReelCaption" placeholder="Caption Reel"></form><div id="shReelFeed"><article class="sh-reel-card">Reel fixture</article></div></details><section class="sh-compose"><div class="sh-compose-head"><div class="sh-avatar">TN</div><button id="shOpenComposer" class="sh-compose-open">Bagikan ide atau chart…</button></div><form id="shComposer" hidden><textarea id="shBody"></textarea><button>Posting</button></form><div class="sh-quick"><button>Foto / Chart</button><button>Video</button><button id="shQuickStory">Buat Story</button><button id="shQuickReel">Tambah Reel</button></div></section><div class="sh-feedbar"><h2>Linimasa Komunitas</h2><label>Urutkan <select id="shSort"><option>Terbaru</option></select></label></div><div class="sh-feed" id="shFeed"><article class="sh-panel sh-post"><header class="sh-post-header"><div class="sh-avatar">TR</div><div class="sh-post-meta"><a href="/profil.html?user=test">Trader Pengujian</a><time>Data sintetis • bukan postingan asli</time></div><button class="sh-post-options">⋯</button></header><p class="sh-post-body">Contoh tampilan postingan dengan media. Seluruh nama dan konten pada uji ini adalah data simulasi.</p><div class="sh-post-photo" role="img" aria-label="Placeholder media uji"></div><div class="sh-countrow"><span>0 reaksi</span><span>0 komentar</span></div><div class="sh-post-actions"><button id="test-comment">Komentar</button><button>Bagikan</button></div></article></div><button id="shMore">Muat lainnya</button></div></section><aside class="sh-right">Old right panel</aside></main><dialog class="sh-story-dialog" id="shStoryCreate">Story fixture</dialog><script>window.testComments=0;window.originalComment=document.getElementById('test-comment');originalComment.onclick=()=>window.testComments++;document.getElementById('shMessengerButton').onclick=()=>document.getElementById('shMessengerPane').hidden=false;document.querySelector('[data-sh-theme="light"]').onclick=()=>document.documentElement.dataset.traderTheme='light';</script></body></html>'''

with sync_playwright() as p:
    chrome=Path('/usr/bin/google-chrome')
    opts={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage']}
    if chrome.exists():opts['executable_path']=str(chrome)
    browser=p.chromium.launch(**opts)
    for width in [360,412]:
        context=browser.new_context(viewport={'width':width,'height':820},device_scale_factor=1)
        page=context.new_page();errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
        def route(r):
            if r.request.url.startswith(BASE+'/api/content'):r.fulfill(status=200,content_type='application/json',body=json.dumps({'articles':articles}))
            elif r.request.url.startswith(BASE+'/__android43/news'):r.fulfill(status=200,content_type='text/html',body=news)
            elif r.request.url.startswith(BASE+'/beranda-trader.html'):r.fulfill(status=200,content_type='text/html',body=social_fixture)
            else:r.abort()
        page.route('**/*',route)
        page.goto(BASE+'/__android43/news');page.wait_for_selector('article')
        check(f'{width}: loaded published news',page.locator('article').count()==12)
        check(f'{width}: draft omitted','Draft should not appear' not in page.inner_text('body'))
        check(f'{width}: news no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
        page.screenshot(path=str(OUT/f'news-{width}.png'),full_page=False)
        page.get_by_role('button',name='Emas',exact=True).click();check(f'{width}: category filter',page.locator('article').count()==4)
        page.locator('#search').fill('nomor 1');check(f'{width}: search in category',page.locator('article').count()==3)
        page.locator('#search').fill('not-a-real-headline');check(f'{width}: empty search',page.get_by_text('Tidak ada berita yang cocok',exact=True).is_visible())
        page.locator('#search').fill('');page.get_by_role('button',name='Semua',exact=True).click()
        page.locator('.save').first.click();page.get_by_role('button',name='Disimpan',exact=True).click();check(f'{width}: bookmark filter',page.locator('article').count()==1)
        page.reload();page.wait_for_selector('article');page.get_by_role('button',name='Disimpan',exact=True).click();check(f'{width}: bookmark survives reload',page.locator('article').count()==1)
        page.get_by_role('button',name='Ganti tema',exact=True).click();check(f'{width}: light theme',page.get_attribute('html','data-theme')=='light')
        page.get_by_role('button',name='Semua',exact=True).click();page.locator('#more').click();check(f'{width}: load more',page.locator('article').count()==18)
        page.goto(BASE+'/beranda-trader.html');page.add_style_tag(content=css);page.evaluate(js);page.wait_for_selector('#mm43-social-header')
        check(f'{width}: direct feed',page.locator('#shFeed').is_visible())
        check(f'{width}: old sidebar hidden',not page.locator('.sh-left').is_visible())
        check(f'{width}: media before caption',page.evaluate("document.querySelector('.sh-post-photo').nextElementSibling.classList.contains('sh-post-body')"))
        page.locator('#test-comment').click();check(f'{width}: original handler preserved',page.evaluate('window.testComments')==1)
        page.evaluate(js);check(f'{width}: idempotent social mount',page.locator('#mm43-social-header').count()==1)
        check(f'{width}: social no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
        bb=page.locator('.sh-story-avatar').first.bounding_box();check(f'{width}: round stories',abs(bb['width']-bb['height'])<1)
        page.screenshot(path=str(OUT/f'social-{width}.png'),full_page=False)
        page.get_by_role('button',name='Reels',exact=True).click();check(f'{width}: reels mode',page.locator('#shReelsPanel').is_visible() and not page.locator('#shFeed').is_visible())
        page.get_by_role('button',name='Linimasa',exact=True).click();page.get_by_role('button',name='Buat postingan, Story atau Reels',exact=True).click();page.get_by_role('button',name='Postingan • foto / video',exact=True).click();check(f'{width}: composer accessible',page.locator('#shComposer').is_visible())
        page.get_by_role('button',name='Cari trader, grup, atau postingan',exact=True).click();check(f'{width}: search accessible',page.locator('#shSearch').is_visible())
        check(f'{width}: no JavaScript errors',not errors)
        context.close()
    context=browser.new_context(viewport={'width':360,'height':800});page=context.new_page()
    page.route('**/*',lambda r:r.fulfill(status=503,content_type='application/json',body='{}') if '/api/content' in r.request.url else r.fulfill(content_type='text/html',body=news))
    page.goto(BASE+'/__android43/news');page.wait_for_selector('.retry');check('Offline news offers retry',page.get_by_role('button',name='Coba lagi',exact=True).is_visible());page.screenshot(path=str(OUT/'news-offline.png'))
    browser.close()
(OUT/'ui-results.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'fixtures':'synthetic','real_google_login_tested':False,'production_data_mutated':False},indent=2))
print('RESULT:',len(checks),'UI checks passed')
