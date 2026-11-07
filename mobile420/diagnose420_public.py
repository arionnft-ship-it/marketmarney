"""Public metadata only: real production JS vs exact 4.19 APK assets, no login/writes.
Browser replay models AppResources49 and MainActivity.adapt. It is not an Android
WebView/GPU benchmark. Service workers are blocked in BOTH arms so requests are
observable and every non-GET/HEAD request can be denied. No response bodies,
page text, screenshots, storage, cookies, console arguments, or user data saved.
"""
import argparse, asyncio, collections, hashlib, json, re, shutil, time, zipfile
from pathlib import Path
from urllib.parse import urlsplit, parse_qs
from playwright.async_api import async_playwright

BASE = 'https://marketmarney.com'
APK_SHA = 'c4ea1864de45ebb0f6463c14cf140bbe49f3c397fe56bb274133154fe5708aa2'
BRAND = ['/__android417/brand/logo.png', '/assets/brand-logo.webp', '/assets/brand-logo.png', '/favicon.png', '/assets/apple-touch-icon.png', '/assets/embedded-favicon.png', '/icons/icon-192.png', '/icons/icon-512.png', '/marketmarney-m-logo.png']
SCENARIOS = [('home', '/index.html'), ('market', '/index.html#marketlive'), ('social', '/beranda-trader.html'), ('account', '/akun.html'), ('group_guest', '/grup-trader.html'), ('profile_guest', '/profil.html'), ('news', '/index.html#berita'), ('xauwar', '/assets/xau-war-3d.html?v=7.7'), ('social_revisit', '/beranda-trader.html')]
KNOWN = {urlsplit(p).path for _, p in SCENARIOS} | {'/', '/__android43/news', '/sw.js'}
CSP = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; connect-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self' https://fonts.gstatic.com; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'self'"
NEWS_CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src https: data:; base-uri 'none'; form-action 'none'"


def sha(value):
    return hashlib.sha256(value if isinstance(value, bytes) else value.encode()).hexdigest()


def safe_url(value):
    try:
        u = urlsplit(value)
        if u.scheme not in ('http', 'https', 'ws', 'wss'):
            return u.scheme + ':'
        parts = []
        for part in u.path.split('/'):
            if re.fullmatch(r'[A-Fa-f0-9]{16}\.(js|css)', part):
                parts.append(part)
            elif len(part) > 40 or '@' in part or '%' in part or re.search(r'\d{5,}', part) or re.fullmatch(r'[A-Fa-f0-9-]{24,}', part):
                parts.append('[id]')
            else:
                parts.append(part[:60])
        path = '/'.join(parts)
        # Unknown dynamic API values can be names as well as numeric IDs.
        path = re.sub(r'(/api/(?:trader-profiles|social-video)/).*', r'\1[id]', path)
        query = parse_qs(u.query)
        suffix = '?v=' + query['v'][0] if set(query) == {'v'} and re.fullmatch(r'[\d.]{1,12}', query['v'][0]) else ('?[redacted]' if query else '')
        return f'{u.scheme}://{u.hostname or ""}{path}{suffix}'
    except Exception:
        return '[invalid-url]'


def error_tag(value):
    text = str(value)
    choices = [('csp', r'Content Security Policy|content-security-policy|Refused to'), ('network', r'Failed to fetch|NetworkError|ERR_|net::'), ('type_error', r'TypeError'), ('reference_error', r'ReferenceError'), ('syntax_error', r'SyntaxError'), ('webgl', r'WebGL|GPU|gl[A-Z]'), ('websocket', r'WebSocket'), ('cors', r'CORS|cross-origin'), ('auth', r'\b40[13]\b'), ('not_found', r'\b404\b')]
    return {'category': next((tag for tag, p in choices if re.search(p, text, re.I)), 'other'), 'fingerprint': sha(text)[:16]}


def read_apk(folder):
    matches = [p for p in Path(folder).rglob('*.apk') if sha(p.read_bytes()) == APK_SHA]
    if len(matches) != 1:
        raise RuntimeError('Expected exactly one APK matching the delivered 4.19 SHA-256')
    with zipfile.ZipFile(matches[0]) as z:
        assets = {n[7:]: z.read(n) for n in z.namelist() if n.startswith('assets/') and not n.endswith('/')}
    mapping = json.loads(assets['resources49-map.json'])
    for route, path in mapping.items():
        if path not in assets or '..' in route or '..' in path:
            raise RuntimeError('Invalid APK resource map')
    mapping.update({p: 'brand417/logo.png' for p in BRAND})
    css = '\n'.join(assets[p].decode() for p in ['social44.css', 'reels46.css', 'navigation47.css', 'premium411.css'])
    js = '\n'.join(assets[p].decode() for p in ['profile49.js', 'social44.js', 'reels46.js', 'navigation47.js'])
    brand = assets['branding417.js'].decode()
    adapt = """(() => { if(location.origin!=='https://marketmarney.com'||!document.head||!document.body)return;
window.MarketMarneyApp={platform:'android',version:'4.19'};document.documentElement.dataset.mmAndroid='419';
if(!document.getElementById('mm43-common')){const s=document.createElement('style');s.id='mm43-common';s.textContent='#mmInstall{display:none!important}';document.head.appendChild(s);}
""" + brand + "\nif(!['/beranda-trader.html','/grup-trader.html','/profil.html'].includes(location.pathname)||window.__mm411BundledReady)return;\n" + "let s=document.getElementById('mm43-social-style');if(!s){s=document.createElement('style');s.id='mm43-social-style';document.head.appendChild(s);}if(s.dataset.revision!=='419'){s.textContent=" + json.dumps(css) + ";s.dataset.revision='419';}\n" + js + '\n})()'
    return assets, mapping, adapt


INIT = """(() => {
const d=window.__diag420={longTasks:[],mutations:0,rafFrames:0,maxRafGap:0,intervals:0,timeouts:0};
try{new PerformanceObserver(l=>{for(const x of l.getEntries())if(d.longTasks.length<300)d.longTasks.push(x.duration)}).observe({type:'longtask',buffered:true})}catch(e){}
const si=window.setInterval,st=window.setTimeout;window.setInterval=function(...a){d.intervals++;return si.apply(this,a)};window.setTimeout=function(...a){d.timeouts++;return st.apply(this,a)};
let prev=0;const frame=t=>{if(prev)d.maxRafGap=Math.max(d.maxRafGap,t-prev);prev=t;d.rafFrames++;requestAnimationFrame(frame)};requestAnimationFrame(frame);
new MutationObserver(r=>d.mutations+=r.length).observe(document,{subtree:true,childList:true,attributes:true});
})()"""
SNAPSHOT = r"""() => {
const d=window.__diag420||{}, nav=performance.getEntriesByType('navigation')[0], r=document.documentElement;
const visible=e=>{const b=e.getBoundingClientRect(),s=getComputedStyle(e);return b.width>0&&b.height>0&&s.display!=='none'&&s.visibility!=='hidden'};
const gates=[...document.querySelectorAll('#gate,#loginGate,#authGate,#guestGate,.auth-gate,.login-gate')].filter(visible).length;
const names=['mm47-nav','mm44-nav','mm44-reels','mm411-logo','app','feed','room','compose','user'];
const ids=Object.fromEntries(names.map(id=>[id,!!document.getElementById(id)&&visible(document.getElementById(id))]));
const links=[...document.querySelectorAll('a[href]')].filter(visible).map(a=>{try{return new URL(a.href).pathname}catch(e){return ''}}).filter(p=>/^\/(?:index|akun|beranda-trader|grup-trader|profil|journal)\.html$/.test(p));
const controls=[...document.querySelectorAll('button,a[href],input,select,[role=button]')].filter(visible);let covered=0;
for(const e of controls.slice(0,100)){const b=e.getBoundingClientRect();if(b.top<0||b.bottom>innerHeight)continue;const t=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);if(t&&t!==e&&!e.contains(t))covered++;}
return {readyState:document.readyState, navigation:nav?{ttfbMs:nav.responseStart-nav.requestStart,domContentLoadedMs:nav.domContentLoadedEventEnd,loadMs:nav.loadEventEnd,transferBytes:nav.transferSize}:null,paint:performance.getEntriesByType('paint').map(p=>({name:p.name,ms:p.startTime})),longTasks:{count:(d.longTasks||[]).length,totalMs:(d.longTasks||[]).reduce((a,b)=>a+b,0),maxMs:Math.max(0,...(d.longTasks||[]))},mutations:d.mutations,intervalsCreated:d.intervals,timeoutsCreated:d.timeouts,rafFrames:d.rafFrames,maxRafGapMs:d.maxRafGap,overflowPx:Math.max(0,r.scrollWidth-innerWidth),visibleControls:controls.length,coveredControls:covered,authGateCount:gates,knownVisibleIds:ids,visibleNavigation:[...new Set(links)],scriptCount:document.scripts.length,iframeCount:document.querySelectorAll('iframe').length,canvasCount:document.querySelectorAll('canvas').length,serviceWorkerControlled:!!navigator.serviceWorker?.controller,resources:performance.getEntriesByType('resource').length,bundledReady:!!window.__mm411BundledReady};
}"""


async def run(args):
    out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
    assets, mapping, adapt = read_apk(args.apk_dir)
    report = {'apkSha256': APK_SHA, 'startedUtc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'readOnly': True, 'realProductionScripts': True, 'auth': 'fresh anonymous contexts; no accounts or credentials', 'limitations': ['Chromium mobile viewport replay, not a native Android WebView or GPU benchmark', 'Service workers blocked in both arms for full request observation and write protection', 'Non-GET/HEAD, auth-start/logout and WebSockets blocked; blocked activity is reported', 'No authentication, posting, messages, uploads, or trades attempted; guest gating may be expected', '7 second navigation deadline plus 1.2 second observation; incomplete loads remain visible'], 'cases': []}
    def save():
        (out/'public-integration.json').write_text(json.dumps(report, indent=2))
    save()
    chrome = next((shutil.which(p) for p in ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'] if shutil.which(p)), None)
    if not chrome:
        raise RuntimeError('Hosted runner Chrome is unavailable; no substitute download was attempted')
    started = time.monotonic()
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(executable_path=chrome, headless=True, args=['--disable-dev-shm-usage'])
        contexts = {}
        for mode in ['live', 'apk419_replay']:
            ctx = await browser.new_context(viewport={'width':412,'height':820}, is_mobile=True, device_scale_factor=1, has_touch=True, service_workers='block', user_agent='Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 MarketMarneyAndroid/4.19 AppShell')
            await ctx.add_init_script(INIT)
            contexts[mode] = ctx
        for label, route_path in SCENARIOS:
            for mode, ctx in contexts.items():
                if time.monotonic()-started > 180:
                    report['budgetReached']=True;save();await browser.close();return
                path = '/__android43/news' if label=='news' and mode=='apk419_replay' else route_path
                result = {'name': label, 'mode': mode, 'requested': safe_url(BASE+path), 'blocked': [], 'errors': [], 'console': [], 'http': []}
                page = await ctx.new_page(); requests = {}; capped=0
                async def handler(route):
                    req=route.request; u=urlsplit(req.url)
                    if req.method not in ('GET','HEAD') or re.search(r'/api/auth/(?:google/start|logout)|/logout(?:[/?]|$)',u.path):
                        if len(result['blocked'])<30:result['blocked'].append({'method':req.method,'url':safe_url(req.url),'reason':'write_or_auth_action'})
                        await route.abort('blockedbyclient');return
                    if mode=='apk419_replay' and u.scheme=='https' and u.hostname=='marketmarney.com' and u.path in mapping:
                        f=mapping[u.path];mime='image/png' if f.endswith('.png') else 'text/css' if f.endswith('.css') else 'text/javascript' if f.endswith('.js') else 'text/html'
                        h={'content-type':mime,'cache-control':'no-store','x-content-type-options':'nosniff','x-marney-asset':'49'}
                        if f.endswith('.html'):h['content-security-policy']=NEWS_CSP if f=='news43.html' else CSP
                        await route.fulfill(status=200,headers=h,body=assets[f]);return
                    await route.continue_()
                await page.route('**/*',handler)
                def ws_block(ws):
                    if len(result['blocked'])<30:result['blocked'].append({'method':'WEBSOCKET','url':safe_url(ws.url),'reason':'no_socket_messages'})
                    asyncio.create_task(ws.close())
                await page.route_web_socket('**/*',ws_block)
                def on_req(req):
                    if len(requests)<350:requests[req]={'method':req.method,'url':safe_url(req.url),'type':req.resource_type,'started':time.monotonic()}
                def on_response(resp):
                    if resp.request in requests:requests[resp.request]['status']=resp.status
                def on_finished(req):
                    if req in requests:requests[req]['elapsedMs']=round((time.monotonic()-requests[req]['started'])*1000)
                def on_failed(req):
                    on_finished(req)
                    if req in requests:requests[req]['failure']=error_tag(req.failure or 'unknown')
                page.on('request',on_req);page.on('response',on_response);page.on('requestfinished',on_finished);page.on('requestfailed',on_failed)
                page.on('pageerror',lambda e: result['errors'].append(error_tag(str(e))) if len(result['errors'])<30 else None)
                page.on('console',lambda m: result['console'].append({'type':m.type,**error_tag(m.text),'source':safe_url(m.location.get('url',''))}) if m.type in ('error','warning') and len(result['console'])<40 else None)
                async def apply_adapt(target=page, selected_mode=mode, entry=result):
                    if selected_mode=='apk419_replay':
                        try:await target.evaluate(adapt)
                        except Exception as e:
                            if len(entry['errors'])<30:entry['errors'].append({'during':'native_adapt_replay',**error_tag(e)})
                # Same two completion points as the native adapter as closely as Chromium permits.
                page.on('domcontentloaded', lambda: asyncio.create_task(apply_adapt()))
                page.on('load', lambda: asyncio.create_task(apply_adapt()))
                t=time.monotonic()
                try:
                    response=await page.goto(BASE+path,wait_until='domcontentloaded',timeout=7000)
                    result['documentStatus']=response.status if response else None
                    result['domWaitMs']=round((time.monotonic()-t)*1000)
                    await page.wait_for_timeout(1200)
                    result['snapshot']=await asyncio.wait_for(page.evaluate(SNAPSHOT),timeout=2.5)
                    if response and response.status==200 and response.request.resource_type=='document':
                        body=await asyncio.wait_for(response.body(),timeout=2)
                        if len(body)<2_000_000:
                            source=body.decode('utf-8','replace')
                            refs=re.findall(r'(?:src|href)=[\"\']([^\"\'<>]+\.(?:js|css|webmanifest)(?:\?[^\"\'<>]*)?)[\"\']',source)
                            result['documentMeta']={'sha256':sha(body),'bytes':len(body),'staticReferences':list(dict.fromkeys(safe_url(BASE+r if r.startswith('/') else r) for r in refs))[:80]}
                except Exception as e:
                    result['navigationError']={'kind':type(e).__name__,**error_tag(e),'elapsedMs':round((time.monotonic()-t)*1000)}
                    try:result['snapshot']=await asyncio.wait_for(page.evaluate(SNAPSHOT),timeout=1)
                    except Exception:pass
                result['final']=safe_url(page.url)
                records=[]
                for req,item in list(requests.items()):
                    record={k:v for k,v in item.items() if k!='started'}
                    record['unfinished']='elapsedMs' not in item
                    if record['unfinished']:record['observedMs']=round((time.monotonic()-item['started'])*1000)
                    records.append(record)
                result['requestCount']=len(records)
                result['statusCounts']=dict(collections.Counter(str(r.get('status','pending_or_failed')) for r in records))
                result['http']=sorted(records,key=lambda r:(r.get('status',0)>=400 or bool(r.get('failure')) or r['unfinished'],r.get('elapsedMs',r.get('observedMs',0))),reverse=True)[:100]
                result['durationMs']=round((time.monotonic()-t)*1000)
                report['cases'].append(result);save()
                print(json.dumps({'case':label,'mode':mode,'documentStatus':result.get('documentStatus'),'durationMs':result['durationMs'],'requests':len(records),'statuses':result['statusCounts'],'errors':len(result['errors']),'blocked':len(result['blocked']),'navigationError':result.get('navigationError',{}).get('kind')}),flush=True)
                await page.close()
        await browser.close()
    report['elapsedSeconds']=round(time.monotonic()-started,1);report['completed']=True;save()


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--apk-dir',required=True);p.add_argument('--out',default='diagnostics420');args=p.parse_args()
    asyncio.run(run(args))
