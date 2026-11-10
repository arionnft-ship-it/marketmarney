from playwright.sync_api import sync_playwright
from pathlib import Path
import json

URL='https://marketmarney.com/berita/mm-analysis-2dee2e8ece2d47278fa10c8a01dac0ac/gbp-usd-skenario-h4'
out=Path('analysis-detail-verification')
out.mkdir(exist_ok=True)
results=[]
failures=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch()
    for screen,viewport in [('desktop', {'width':1440,'height':960}),('mobile', {'width':390,'height':844})]:
        context=browser.new_context(viewport=viewport,device_scale_factor=1,service_workers='block')
        page=context.new_page()
        errors=[]
        page.on('pageerror', lambda err: errors.append(str(err)))
        try:
            response=page.goto(URL,wait_until='domcontentloaded',timeout=60000)
            page.wait_for_timeout(4500)
            data=page.evaluate("""() => {
              const main=document.querySelector('main:not(#app)')||document.querySelector('main');
              const panel=document.getElementById('mm-analysis-readable-v1');
              const selector='script[src*="mm-analysis-article-v1"]';
              return {
                pathname:location.pathname,
                httpTitle:document.title,
                scripts:[...document.querySelectorAll(selector)].map(x=>x.src),
                articleTitle:main?.querySelector('h1')?.textContent?.trim()||null,
                newPanel:!!panel,
                panelText:panel?.innerText?.slice(0,1500)||null,
                chips:[...document.querySelectorAll('.mm-analysis-article-chip')].map(x=>x.textContent),
                scenarioCount:document.querySelectorAll('.mm-analysis-article-scenario').length,
                levelCount:document.querySelectorAll('.mm-analysis-article-level').length,
                hiddenOriginals:document.querySelectorAll('.mm-analysis-article-original-hidden').length,
                tagCount:document.querySelectorAll('.mm-analysis-article-tags span').length,
                disclaimerCount:document.querySelectorAll('.mm-analysis-article-disclaimer').length,
                imageCount:main?.querySelectorAll('img').length,
                documentWidth:document.documentElement.scrollWidth,
                viewportWidth:document.documentElement.clientWidth
              };
            }""")
            data['screen']=screen
            data['responseStatus']=response.status if response else None
            data['errors']=errors[:12]
            results.append(data)
            page.screenshot(path=str(out/(screen+'.png')),full_page=True)
            assert data['responseStatus']==200, 'bad_article_status'
            assert data['newPanel'], 'analysis_panel_missing'
            assert data['scenarioCount']==3, 'wrong_scenario_count'
            assert data['levelCount']==2, 'wrong_support_resistance_count'
            assert data['disclaimerCount']==1, 'disclaimer_missing_or_duplicate'
            assert data['hiddenOriginals']>=2, 'duplicate_legacy_paragraphs_visible'
            assert data['imageCount']>=1, 'chart_image_missing'
            assert data['documentWidth']<=data['viewportWidth']+4, 'horizontal_overflow'
            assert not errors, 'javascript_page_error'
        except Exception as e:
            failures.append(screen+': '+str(e))
        finally:
            context.close()
    browser.close()
report={'results':results,'failures':failures}
(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False,indent=2))
if failures:raise SystemExit(1)
