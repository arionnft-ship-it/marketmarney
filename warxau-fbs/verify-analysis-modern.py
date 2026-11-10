from pathlib import Path
import json
from playwright.sync_api import sync_playwright

BASE="https://marketmarney.com/"
CSS=Path("warxau-fbs/analysis-modern.css").read_text()
OUT=Path("analisa-modern-preview")
OUT.mkdir(exist_ok=True)
report={"mode":"CSS preview only (no website writes)","screens":[],"failures":[]}
with sync_playwright() as pw:
    browser=pw.chromium.launch()
    for name,width,height in [("desktop",1440,950),("mobile",390,844)]:
        context=browser.new_context(viewport={"width":width,"height":height},service_workers="block",reduced_motion="reduce")
        page=context.new_page()
        errors=[]
        page.on("pageerror",lambda e:errors.append(str(e)[:180]))
        try:
            r=page.goto(BASE,wait_until="domcontentloaded",timeout=60000)
            page.wait_for_selector('.navbtn[data-page="Analisa"]',state="attached",timeout=18000)
            page.evaluate("""() => document.querySelector('.navbtn[data-page="Analisa"]').click()""")
            page.wait_for_selector('#mm-analysis-public-v1 .mm-analysis-public-head',timeout=25000)
            page.add_style_tag(content=CSS)
            page.wait_for_timeout(1800)
            info=page.evaluate("""() => {
                const shell=document.querySelector('section.mm87-shell.mm1815-anal-shell');
                const panel=document.querySelector('#mm-analysis-public-v1');
                const pivot=shell?.querySelector('section.mm1816-pivot-public');
                const guide=shell?.querySelector('.mm87-info');
                const chart=shell?.querySelector('iframe, .widget-technical-analysis, .mm87-panel canvas');
                const cards=[...panel?.querySelectorAll('.mm-analysis-card')||[]];
                const computed=x=>x?getComputedStyle(x):null;
                return {
                  shell:!!shell,panel:!!panel,guide:!!guide,pivot:!!pivot,chart:!!chart,
                  panelAfterGuide:!!guide&&!!panel&&guide.nextElementSibling===panel,
                  pivotAfterPanel:!!panel&&!!pivot&&panel.nextElementSibling===pivot,
                  cardCount:cards.length,cardLinks:cards.map(c=>c.getAttribute('href')).slice(0,4),
                  shellBackground:computed(shell)?.backgroundColor,
                  shellRadius:computed(shell)?.borderRadius,
                  cardRadius:computed(cards[0])?.borderRadius,
                  cardGrid:computed(panel?.querySelector('.mm-analysis-cards'))?.gridTemplateColumns,
                  viewportWidth:innerWidth,documentWidth:document.documentElement.scrollWidth,
                  analysisTitle:panel?.querySelector('h2')?.innerText,
                  iframeCount:shell?.querySelectorAll('iframe').length||0
                };
            }""")
            info.update({"screen":name,"httpStatus":r.status if r else None,"pageErrors":errors[:6]})
            report["screens"].append(info)
            print("CHECK",json.dumps(info,ensure_ascii=False))
            assert info["httpStatus"]==200
            assert info["shell"] and info["panel"] and info["guide"] and info["pivot"] and info["chart"],"missing feature"
            assert info["panelAfterGuide"] and info["pivotAfterPanel"],"wrong analysis placement"
            assert info["cardCount"]>=1,"cards missing"
            assert info["shellRadius"] in ["22px","17px"],"modern styling failed"
            assert info["documentWidth"]<=info["viewportWidth"]+4,"horizontal overflow"
            page.screenshot(path=str(OUT/(name+".png")),full_page=False)
        except Exception as ex:
            report["failures"].append(name+": "+str(ex)[:700])
        finally:
            context.close()
    browser.close()
(OUT/"report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
print("RESULT",json.dumps(report,ensure_ascii=False)[:9500])
if report["failures"]:raise SystemExit(1)
