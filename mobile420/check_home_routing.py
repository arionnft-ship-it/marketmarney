"""Compare native hash assumptions with the public site's actual navigation buttons."""
import asyncio,json,shutil,re
from pathlib import Path
from urllib.parse import urlsplit
from playwright.async_api import async_playwright

SNAPSHOT="""() => {
 const visible=n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(n).visibility!=='hidden'};
 return {path:location.pathname,hash:location.hash,
  containers:[...document.querySelectorAll('main[id],section[id],div[id]')].filter(visible).map(n=>n.id).filter(id=>/^[A-Za-z][A-Za-z0-9_-]{0,45}$/.test(id)).sort(),
  headings:[...document.querySelectorAll('h1,h2')].filter(visible).map(n=>n.textContent.trim().slice(0,100)),
  selectedNavigation:[...document.querySelectorAll('button[data-page]')].filter(visible).map(n=>({page:n.dataset.page,classes:n.className,pressed:n.getAttribute('aria-pressed'),current:n.getAttribute('aria-current')})),
  marketNodes:[...document.querySelectorAll('[id],[data-page],[data-view]')].filter(n=>/marketlive/i.test([n.id,n.getAttribute('data-page'),n.getAttribute('data-view')].join(' '))).map(n=>({tag:n.tagName,id:n.id,page:n.getAttribute('data-page'),view:n.getAttribute('data-view'),visible:visible(n)}))};
}"""

def inline_routes(source):
 """Keep focused router excerpts; do not crawl unrelated external scripts."""
 found=[]
 pattern=re.compile(r'hashchange|location\.hash|data-page|(?:set|show|render|switch)Page|history\.(?:pushState|replaceState)',re.I)
 labels=re.compile(r'Market Live|Beranda|marketlive',re.I)
 for index,script in enumerate(re.finditer(r'<script\b([^>]*)>(.*?)</script\s*>',source,re.I|re.S)):
  if re.search(r'\bsrc\s*=',script[1],re.I):continue
  body=script[2];snippets=[];covered=[]
  for match in [*pattern.finditer(body),*labels.finditer(body)]:
   start=max(0,match.start()-350);end=min(len(body),match.end()+550)
   if any(start<=b and end>=a for a,b in covered):continue
   snippet=body[start:end]
   if not re.search(r'client_secret|api[_-]?key|access_token',snippet,re.I):snippets.append(snippet)
   covered.append((start,end))
   if len(snippets)>=18:break
  if snippets:found.append({'inlineScript':index,'length':len(body),'snippets':snippets})
  if len(found)>=8:break
 return found

def same_content(a,b):
 return bool(a and b and a.get('headings')==b.get('headings') and a.get('containers')==b.get('containers'))

async def probe(result):
 async with async_playwright() as pw:
  chrome=shutil.which('google-chrome') or shutil.which('chromium')
  browser=await pw.chromium.launch(executable_path=chrome,headless=True)
  context=await browser.new_context(viewport={'width':412,'height':820},is_mobile=True,has_touch=True,service_workers='block')
  async def route(r):
   path=urlsplit(r.request.url).path
   if r.request.method not in ('GET','HEAD') or '/api/auth/' in path or 'logout' in path:
    result['blockedWrites']+=1;await r.abort();return
   if r.request.is_navigation_request() and r.request.resource_type=='document' and r.request.frame.parent_frame is None:result['documents']+=1
   await r.continue_()
  await context.route('**/*',route)
  await context.route_web_socket('**/*',lambda socket:socket.close())
  page=await context.new_page()
  page.set_default_timeout(3500)
  async def shot(key,target=page):
   await target.wait_for_timeout(700);result[key]=await target.evaluate(SNAPSHOT)
  async def click_navigation(label,key):
   # The website sidebar is collapsed on phones. The native bar invokes this
   # existing click handler directly; do not change CSS just to expose it.
   control=page.locator('#nav button[data-page="'+label+'"]').first
   try:
    was_visible=await control.is_visible()
    await control.evaluate("button => {if(typeof button.onclick!=='function')throw Error('Website navigation handler is not ready');button.click()}",timeout=3500)
    await shot(key)
    result[key]['clickedLabel']=label
    result[key]['sidebarButtonVisible']=was_visible
    result[key]['existingHandlerInvoked']=True
    return True
   except Exception as error:
    result.setdefault('navigationErrors',[]).append({'label':label,'error':str(error)[:350]})
    return False
  response=await page.goto('https://marketmarney.com/index.html',wait_until='domcontentloaded',timeout=12000)
  result['navigationControls']=await page.evaluate("""() => [...document.querySelectorAll('nav a,nav button,#nav a,#nav button,[data-page],[data-view]')].map(n=>({tag:n.tagName,id:n.id,text:n.textContent.trim().slice(0,70),href:n.getAttribute('href'),page:n.getAttribute('data-page'),view:n.getAttribute('data-view'),onclick:n.getAttribute('onclick')})).slice(0,90)""")
  result['routeSource']=inline_routes(await response.text()) if response else []
  result['externalScriptFetches']=0
  await shot('initialHome')
  button_docs=result['documents']
  market_clicked=await click_navigation('Market Live','buttonMarket')
  home_clicked=await click_navigation('Beranda','buttonHome')
  result['realButtonsSameDocument']=result['documents']==button_docs
  result['realButtonsChangeContent']=market_clicked and home_clicked and not same_content(result.get('buttonMarket'),result.get('buttonHome'))
  docs=result['documents']
  await page.evaluate("location.hash='marketlive'")
  await shot('hashMarket')
  await page.evaluate("location.hash=''")
  await shot('hashHome')
  result['sameDocumentTransitions']=result['documents']==docs
  # A fresh context makes this a real document load, not another same-page hash change.
  fresh=await browser.new_context(viewport={'width':412,'height':820},is_mobile=True,has_touch=True,service_workers='block')
  await fresh.route('**/*',route)
  await fresh.route_web_socket('**/*',lambda socket:socket.close())
  direct=await fresh.new_page()
  await direct.goto('https://marketmarney.com/index.html#marketlive',wait_until='domcontentloaded',timeout=12000)
  await shot('directMarket',direct)
  result['hashMarketMatchesRealMarket']=same_content(result.get('hashMarket'),result.get('buttonMarket'))
  result['directMarketMatchesRealMarket']=same_content(result.get('directMarket'),result.get('buttonMarket'))
  result['hashHomeMatchesRealHome']=same_content(result.get('hashHome'),result.get('buttonHome'))
  result['realButtonLocations']={key:{name:result[key][name] for name in ('path','hash')} for key in ('buttonMarket','buttonHome') if key in result}
  # Matching two incorrect hash renderings is not evidence of a valid Market route.
  result['hashReuseSafe']=bool(result['sameDocumentTransitions'] and result['realButtonsChangeContent'] and result['hashMarketMatchesRealMarket'] and result['directMarketMatchesRealMarket'] and result['hashHomeMatchesRealHome'])
  await browser.close()

async def main():
 out=Path('quality420-preflight');out.mkdir(exist_ok=True,parents=True)
 result={'scope':'public GET/HEAD only; fresh anonymous contexts; real navigation buttons','blockedWrites':0,'documents':0,'hashReuseSafe':False}
 try:
  await asyncio.wait_for(probe(result),timeout=45)
 except Exception as error:
  result['probeError']=type(error).__name__+': '+str(error)[:600]
 finally:
  (out/'live-home-routing.json').write_text(json.dumps(result,indent=2,ensure_ascii=False))
 print(json.dumps(result,ensure_ascii=False))

asyncio.run(main())
