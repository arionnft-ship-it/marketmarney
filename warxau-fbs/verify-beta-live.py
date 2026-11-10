from pathlib import Path
import json
from playwright.sync_api import sync_playwright
BASE="https://marketmarney.com"
out=Path("xauwar-beta-verification");out.mkdir(exist_ok=True)
report={"cases":[],"failures":[]}
with sync_playwright() as p:
 browser=p.chromium.launch()
 for kind,path in [("homepage","/"),("arena","/assets/xau-war-3d.html")]:
  context=browser.new_context(viewport={"width":1300,"height":900},service_workers="block")
  page=context.new_page()
  errors=[]
  page.on("pageerror",lambda e:errors.append(str(e)[:200]))
  try:
   response=page.goto(BASE+path,wait_until="domcontentloaded",timeout=60000)
   page.wait_for_timeout(2400 if kind=="homepage" else 3200)
   data=page.evaluate("""() => {
      const btn=document.getElementById('mm-xau-war-link');
      const h1=[...document.querySelectorAll('h1')].find(el=>el.textContent?.toLowerCase().startsWith('warxau'));
      const scripts=[...document.scripts].filter(el=>el.src?.includes('mm-xauwar-beta-v1')).map(el=>el.src);
      const navBadge=btn?.querySelector('.mm-xauwar-beta-tag');
      const titleBadge=h1?.querySelector('.mm-xauwar-beta-tag');
      return {
       href:location.href, scriptCount:scripts.length,scripts,
       menuExists:!!btn,menuText:btn?.innerText?.slice(0,120)||null,
       navBadge:navBadge?.textContent||null,
       h1Text:h1?.innerText?.slice(0,100)||null,
       titleBadge:titleBadge?.textContent||null,
       betaElements:document.querySelectorAll('.mm-xauwar-beta-tag').length,
       readyState:document.readyState,
       links:[...document.querySelectorAll('link[rel="stylesheet"]')].filter(el=>el.href?.includes('xauwar-beta')).map(el=>el.href)
      };
   }""")
   data.update({"kind":kind,"status":response.status if response else None,"pageErrors":errors[:10]})
   report["cases"].append(data)
   page.screenshot(path=str(out/(kind+".png")),full_page=False)
   assert data["status"]==200
   assert data["scriptCount"]==1,"BETA script not included"
   assert data["navBadge"]=="BETA" if kind=="homepage" else data["titleBadge"]=="BETA",kind+" BETA label missing"
  except Exception as e:
   report["failures"].append(kind+": "+str(e)[:700])
  finally:context.close()
 browser.close()
(out/"report.json").write_text(json.dumps(report,indent=2,ensure_ascii=False))
print(json.dumps(report,ensure_ascii=False)[:9000])
if report["failures"]:raise SystemExit(1)
