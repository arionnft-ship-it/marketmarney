from pathlib import Path
import os, json, subprocess, hashlib
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
BASE='https://marketmarney.com'
VERSION='marney-20261107-r2'
LIVE=os.environ.get('BRAND_LIVE')=='1'
root=Path(__file__).resolve().parent
out=Path('brand-verification');out.mkdir(exist_ok=True)
module=str(root/'branding.cjs')
parts=json.loads(subprocess.check_output(['node','-e',"const b=require(process.argv[1]);console.log(JSON.stringify({css:b.CSS,js:b.CLIENT,paths:[...b.aliases]}))",module],text=True))
paths=dict(parts['paths'])
report={'mode':'live' if LIVE else 'preview','version':VERSION,'pages':[],'checks':[]}
errors=[]
def transform(text):
    return subprocess.check_output(['node','-e',"const b=require(process.argv[1]);let s='';process.stdin.setEncoding('utf8');process.stdin.on('data',x=>s+=x);process.stdin.on('end',()=>process.stdout.write(b.enhance(s)));",module],input=text,text=True)
def intercept(route):
    request=route.request;u=urlsplit(request.url);p=u.path
    if request.method not in ['GET','HEAD','OPTIONS']:
        route.abort();return
    if u.hostname not in ['marketmarney.com','www.marketmarney.com']:
        if request.resource_type in ['media','document']:
            route.abort();return
        route.continue_();return
    if not LIVE:
        if p in paths:
            f=root/'dist'/paths[p]
            kind={'.png':'image/png','.webp':'image/webp','.ico':'image/x-icon'}[f.suffix]
            route.fulfill(status=200,body=f.read_bytes(),content_type=kind);return
        if p=='/assets/marney-brand.js':
            route.fulfill(status=200,body=parts['js'],content_type='text/javascript');return
        if p=='/assets/marney-brand.css':
            route.fulfill(status=200,body=parts['css'],content_type='text/css');return
        if p=='/' or p.endswith('.html'):
            response=route.fetch(timeout=45000,max_redirects=0)
            if response.status==200 and 'text/html' in response.headers.get('content-type',''):
                headers={k:v for k,v in response.headers.items() if k.lower() not in ['content-length','content-encoding','etag','transfer-encoding']}
                route.fulfill(status=200,headers=headers,body=transform(response.text()));return
            route.fulfill(response=response);return
    route.continue_()
with sync_playwright() as pw:
    browser=pw.chromium.launch()
    for label,size in [('desktop',{'width':1440,'height':900}),('mobile',{'width':390,'height':844})]:
        context=browser.new_context(viewport=size,device_scale_factor=1,service_workers='block',ignore_https_errors=False)
        context.route('**/*',intercept)
        page=context.new_page()
        urls=['/','/beranda-trader.html','/akun.html','/profil.html','/grup-trader.html','/journal.html','/offline.html','/assets/xau-war-3d.html'] if label=='desktop' else ['/','/beranda-trader.html','/akun.html','/assets/xau-war-3d.html']
        for p in urls:
            row={'screen':label,'path':p}
            try:
                response=page.goto(BASE+p,wait_until='domcontentloaded',timeout=60000)
                page.wait_for_timeout(2500)
                row['status']=response.status if response else None
                row['url']=page.url
                if row['status'] in [401,403]:
                    row['protected']=True;report['pages'].append(row);continue
                assert row['status']==200, f"status {row['status']}"
                logos=page.locator('img[data-marney-brand]').evaluate_all("els=>els.map(e=>({src:e.currentSrc||e.src,loaded:e.complete&&e.naturalWidth>0,fit:getComputedStyle(e).objectFit,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))")
                row['logos']=logos
                assert logos, 'No MARNEY brand image found'
                assert all(x['loaded'] for x in logos), 'Unloaded brand image'
                assert all(x['fit']=='contain' for x in logos), 'Brand crop not protected'
                row['oldInlineBrand']=page.locator('a.brand img[src^="data:image"]').count()
                assert not row['oldInlineBrand'], 'Old embedded brand remains'
                assert page.locator('#mm-signature-opening').count()==0, 'Cancelled opening must remain off'
                if p=='/':
                    track=page.locator('.news-track').first
                    if track.count():
                        row['newsAnimation']=track.evaluate('(e)=>getComputedStyle(e).animationName')
                        assert row['newsAnimation']=='none', 'News auto animation regressed'
                    card=page.locator('.feature-card.feature-forum').first
                    if card.count():row['socialCard']=card.inner_text()
                name=label+'-'+('home' if p=='/' else p.strip('/').replace('/','-').replace('.html',''))+'.png'
                page.screenshot(path=str(out/name),full_page=False)
                row['screenshot']=name
                if p=='/' and label=='desktop':
                    card=page.locator('.feature-card.feature-forum').first
                    if card.count():
                        card.click();page.wait_for_url('**/beranda-trader.html',timeout=20000)
                        row['socialDirect']=True
            except Exception as ex:
                row['error']=str(ex);errors.append(label+' '+p+': '+str(ex))
            report['pages'].append(row)
        context.close()
    if LIVE:
        request=browser.new_context().request
        manifest=request.get(BASE+'/manifest.webmanifest?v='+VERSION).json()
        assert manifest['id']=='./index.html' and manifest['start_url']=='./index.html'
        assert all(VERSION in x['src'] for x in manifest['icons'])
        report['checks'].append('manifest identity preserved; icons versioned')
        for p,name in paths.items():
            response=request.get(BASE+p+'?v='+VERSION)
            expected=hashlib.sha256((root/'dist'/name).read_bytes()).hexdigest()
            actual=hashlib.sha256(response.body()).hexdigest()
            row={'asset':p,'status':response.status,'sha256':actual,'match':actual==expected,'versionHeader':response.headers.get('x-marney-brand')}
            report['checks'].append(row)
            if response.status!=200 or actual!=expected:errors.append('Asset mismatch: '+p)
        for p,status in [('/_railway/health',200),('/api/content',200),('/api/xau-war/mt4/health',200),('/api/xau-war/mt4/status',401)]:
            response=request.get(BASE+p)
            report['checks'].append({'path':p,'status':response.status,'expected':status})
            if response.status!=status:errors.append('Regression: '+p)
    browser.close()
report['errors']=errors
report['passed']=not errors
(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False,indent=2))
if errors:raise SystemExit(1)
