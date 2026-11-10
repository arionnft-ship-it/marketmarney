from pathlib import Path
from urllib.request import urlopen,Request
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
import json,re,time

BASE="https://marketmarney.com"
out=Path("performance-verification")
out.mkdir(exist_ok=True)
report={"thumbnail":{},"pages":[],"errors":[]}
def read(url,limit=8_000_000):
    with urlopen(Request(url,headers={"User-Agent":"MarketMarneyPerformanceVerification/1.0","Accept":"image/webp,application/json"}),timeout=35) as r:
        headers=dict(r.headers.items())
        data=r.read(limit+1)
        if len(data)>limit:raise ValueError("too_large")
        return r.status,headers,data
try:
    st,h,b=read(BASE+"/api/content")
    doc=json.loads(b)
    analysis=[a for a in doc.get("articles",[]) if a.get("status")=="published" and re.fullmatch(r"mm-analysis-[0-9a-f-]{32,36}",str(a.get("id","")),re.I) and re.fullmatch(r"/media/[0-9a-f-]{36}\.(png|jpe?g|webp)",str(a.get("img","")),re.I)]
    assert analysis,"no_published_analysis_image"
    a=analysis[0]
    original=BASE+a["img"]
    thumbnail=BASE+"/assets/news-thumb-v1/640/"+a["img"].split("/")[-1]
    s0,h0,b0=read(original)
    s1,h1,b1=read(thumbnail)
    cache=h1.get("Cache-Control") or h1.get("cache-control") or ""
    assert s0==200 and s1==200
    assert h1.get("Content-Type","").startswith("image/webp") or h1.get("content-type","").startswith("image/webp")
    assert "max-age=86400" in cache,cache
    assert len(b1)<len(b0),f"thumbnail bigger than original: {len(b1)} vs {len(b0)}"
    report["thumbnail"]={"article":a["id"],"sourceBytes":len(b0),"webp640Bytes":len(b1),"savedPercent":round((1-len(b1)/len(b0))*100,1),"cacheControl":cache}
    print("THUMBNAIL",json.dumps(report["thumbnail"]))
except Exception as e:
    report["errors"].append("thumbnail: "+repr(e))
with sync_playwright() as pw:
    browser=pw.chromium.launch()
    for name,viewport in [("desktop",{"width":1365,"height":900}),("mobile",{"width":390,"height":844})]:
        context=browser.new_context(viewport=viewport,service_workers="block",reduced_motion="reduce")
        page=context.new_page()
        problems=[]
        page.on("pageerror",lambda ex:problems.append(str(ex)[:150]))
        try:
            result=page.goto(BASE+"/",wait_until="domcontentloaded",timeout=60000)
            page.locator(".navbtn").filter(has_text=re.compile("ANALISA",re.I)).first.click(timeout=12000)
            panel=page.locator("#mm-analysis-public-v1")
            panel.wait_for(timeout=20000)
            panel.scroll_into_view_if_needed()
            page.wait_for_timeout(1800)
            data=page.evaluate("""() => {
             const panel=document.getElementById('mm-analysis-public-v1');
             const imgs=[...panel.querySelectorAll('img')];
             const shell=document.querySelector('.mm87-shell.mm1815-anal-shell');
             return {count:imgs.length,thumbs:imgs.map(x=>x.getAttribute('src')).slice(0,10),
                heading:panel.querySelector('h2')?.textContent,
                pivotPresent:!!shell?.querySelector('.mm1816-pivot-public'),
                docWidth:document.documentElement.scrollWidth,
                viewportWidth:innerWidth,
                navFCP:Math.round(performance.getEntriesByType('paint').find(e=>e.name==='first-contentful-paint')?.startTime||0),
                navTTFB:Math.round(performance.getEntriesByType('navigation')[0]?.responseStart||0)};
            }""")
            data.update({"screen":name,"status":result.status,"pageErrors":problems[:4]})
            report["pages"].append(data)
            print("PAGE",json.dumps(data,ensure_ascii=False))
            assert result.status==200
            assert data["count"]>=1, "no_cards"
            assert all("/assets/news-thumb-v1/640/" in src for src in data["thumbs"]), "unoptimized_analysis_images"
            assert data["pivotPresent"], "pivot_lost"
            assert data["docWidth"]<=data["viewportWidth"]+4, "horizontal_overflow"
            page.screenshot(path=str(out/(name+".png")),full_page=False)
        except Exception as e:
            report["errors"].append(name+": "+repr(e))
        finally:
            context.close()
    browser.close()
(out/"report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
print("RESULT",json.dumps(report,ensure_ascii=False)[:7000])
if report["errors"]:raise SystemExit(1)
