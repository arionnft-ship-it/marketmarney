"""Read-only public page check: the native shared view must honor real hash routes."""
import asyncio,json,shutil
from pathlib import Path
from urllib.parse import urlsplit
from playwright.async_api import async_playwright

SNAPSHOT="""() => {
 const visible=n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(n).visibility!=='hidden'};
 return {path:location.pathname,hash:location.hash,
  containers:[...document.querySelectorAll('main[id],section[id],div[id]')].filter(visible).map(n=>n.id).filter(id=>/^[A-Za-z][A-Za-z0-9_-]{0,45}$/.test(id)).sort(),
  headings:[...document.querySelectorAll('main h1,main h2,#app h1,#app h2')].filter(visible).map(n=>n.textContent.trim().slice(0,100)),
  marketNodes:[...document.querySelectorAll('[id],[data-page],[data-view]')].filter(n=>/marketlive/i.test([n.id,n.getAttribute('data-page'),n.getAttribute('data-view')].join(' '))).map(n=>({tag:n.tagName,id:n.id,page:n.getAttribute('data-page'),view:n.getAttribute('data-view'),visible:visible(n)}))};
}"""

async def main():
 out=Path('quality420-preflight');out.mkdir(exist_ok=True,parents=True)
 result={'scope':'public GET/HEAD only; fresh anonymous context','blockedWrites':0,'documents':0}
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
  async def shot(key):
   await page.wait_for_timeout(1000);result[key]=await page.evaluate(SNAPSHOT)
  await page.goto('https://marketmarney.com/index.html',wait_until='domcontentloaded',timeout=12000)
  await shot('initialHome')
  docs=result['documents']
  await page.evaluate("location.hash='marketlive'")
  await shot('hashMarket')
  await page.evaluate("location.hash=''")
  await shot('hashHome')
  result['sameDocumentTransitions']=result['documents']==docs
  await page.goto('https://marketmarney.com/index.html#marketlive',wait_until='domcontentloaded',timeout=12000)
  await shot('directMarket')
  result['marketHeadingsMatch']=result['hashMarket']['headings']==result['directMarket']['headings']
  result['homeHeadingsMatch']=result['initialHome']['headings']==result['hashHome']['headings']
  result['marketChangesContent']=result['initialHome']['headings']!=result['hashMarket']['headings'] or result['initialHome']['containers']!=result['hashMarket']['containers']
  (out/'live-home-routing.json').write_text(json.dumps(result,indent=2,ensure_ascii=False))
  await browser.close()
 print(json.dumps(result,ensure_ascii=False))
 assert result['sameDocumentTransitions'] and result['marketHeadingsMatch'] and result['homeHeadingsMatch'] and result['marketChangesContent']

asyncio.run(main())
