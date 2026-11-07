#!/usr/bin/env python3
"""Check that the exact APK light layer hides only theme controls and never blocks app clicks."""
import argparse
import asyncio
import json
import shutil
import sys
import time
import zipfile
from pathlib import Path
from playwright.async_api import async_playwright

HTML = """<!doctype html>
<html data-mm-theme='dark' data-theme='dark' data-trader-theme='dark' data-journal-theme='dark' data-ac-theme='dark' data-j-theme='dark'>
<head><meta name='viewport' content='width=device-width,initial-scale=1'><meta name='color-scheme' content='dark light'>
<style>html,body{margin:0;min-height:100%;background:#07111c;color:white;font:16px sans-serif}main{padding:24px}button{min-height:44px;margin:4px;padding:8px 14px}#state{padding:16px;background:#111}</style></head>
<body><main><nav id='nav'><button data-page='Beranda' class='active'>Beranda</button><button data-page='Market Live'>Market Live</button></nav>
<p id='state'>Beranda</p><button id='normalAction'>Aksi biasa</button><button id='theme' aria-label='Ganti tema'>Tema</button>
<button data-ac-theme='dark'>Akun gelap</button><button data-j-theme='dark'>Jurnal gelap</button>
<script>
window.__normalClicks=0;
document.getElementById('normalAction').addEventListener('click',function(){window.__normalClicks++;this.textContent='Berhasil '+window.__normalClicks});
document.querySelectorAll('#nav button').forEach(function(button){button.addEventListener('click',function(){document.querySelectorAll('#nav button').forEach(function(n){n.classList.remove('active');n.removeAttribute('aria-current')});button.classList.add('active');button.setAttribute('aria-current','page');document.getElementById('state').textContent=button.dataset.page})});
</script></main></body></html>"""

async def run(args):
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    report = {'success': False, 'checks': [], 'started': time.time()}

    def check(name, value, detail=None):
        report['checks'].append({'name': name, 'passed': bool(value), 'detail': detail})
        if not value:
            raise AssertionError(name + (': ' + str(detail) if detail is not None else ''))

    with zipfile.ZipFile(args.apk) as archive:
        script = archive.read('assets/light425.js').decode('utf-8')
        css = archive.read('assets/light425.css').decode('utf-8')

    chrome = args.chrome or next((shutil.which(name) for name in
        ('google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser') if shutil.which(name)), None)
    check('System Chrome is available', bool(chrome), chrome)

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(executable_path=chrome, headless=True,
            args=['--disable-dev-shm-usage', '--disable-background-networking'])
        context = await browser.new_context(viewport={'width': 412, 'height': 915}, is_mobile=True,
            has_touch=True, locale='id-ID', service_workers='block')
        await context.route('https://marketmarney.com/light425-interaction.html',
            lambda route: route.fulfill(status=200, content_type='text/html', body=HTML))
        await context.add_init_script("window.MarketMarneyChrome={setTheme:function(v){window.__tone=String(v)}}")
        page = await context.new_page()
        page_errors = []
        page.on('pageerror', lambda error: page_errors.append(str(error)))
        await page.goto('https://marketmarney.com/light425-interaction.html', wait_until='domcontentloaded')
        await page.add_style_tag(content=css)
        await page.evaluate(script)
        await page.wait_for_function("document.documentElement.dataset.mmLightOnly==='425'")

        layout = await page.evaluate("""() => ({
          html:getComputedStyle(document.documentElement).display,
          body:getComputedStyle(document.body).display,
          htmlWidth:document.documentElement.getBoundingClientRect().width,
          bodyHeight:document.body.getBoundingClientRect().height,
          ac:document.documentElement.dataset.acTheme,
          journal:document.documentElement.dataset.jTheme,
          tone:window.__tone
        })""")
        check('Theme-state attributes do not hide the root document',
              layout['html'] != 'none' and layout['body'] != 'none' and layout['htmlWidth'] > 300 and layout['bodyHeight'] > 100, layout)
        check('Root account and journal states are forced light',
              layout['ac'] == 'light' and layout['journal'] == 'light' and layout['tone'] == 'light', layout)

        await page.locator('#normalAction').click()
        check('A normal application button remains clickable',
              await page.evaluate("window.__normalClicks===1 && document.getElementById('normalAction').textContent==='Berhasil 1'"))
        await page.locator('#nav button[data-page="Market Live"]').click()
        check('Navigation event listeners remain clickable',
              await page.evaluate("document.getElementById('state').textContent==='Market Live' && document.querySelector('#nav button[data-page=\"Market Live\"]').classList.contains('active')"))

        hidden = await page.evaluate("""() => [...document.querySelectorAll('#theme,button[data-ac-theme],button[data-j-theme]')]
          .every(node=>node.hidden && getComputedStyle(node).display==='none' && node.tabIndex===-1)""")
        check('Only actual theme controls are hidden', hidden)

        await page.evaluate("""() => {
          const root=document.documentElement;
          root.dataset.mmTheme='dark';root.dataset.acTheme='dark';root.dataset.jTheme='dark';
        }""")
        await page.wait_for_function("document.documentElement.dataset.mmTheme==='light' && document.documentElement.dataset.acTheme==='light' && document.documentElement.dataset.jTheme==='light'")
        await page.locator('#nav button[data-page="Beranda"]').click()
        check('Navigation still works after a rejected dark-mode attempt',
              await page.evaluate("document.getElementById('state').textContent==='Beranda'"))
        check('No uncaught browser errors occurred', not page_errors, page_errors)

        await page.screenshot(path=str(out / 'light425-interaction.png'), animations='disabled')
        await context.close()
        await browser.close()

    report['success'] = True
    report['elapsedSeconds'] = round(time.time() - report['started'], 2)
    (out / 'interaction425-report.json').write_text(json.dumps(report, indent=2, ensure_ascii=False))
    print(json.dumps({'success': True, 'checks': len(report['checks']), 'elapsedSeconds': report['elapsedSeconds']}))
    return 0

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apk', default='deliver/Marney425.apk')
    parser.add_argument('--out', default='quality425')
    parser.add_argument('--chrome')
    args = parser.parse_args()
    try:
        sys.exit(asyncio.run(asyncio.wait_for(run(args), timeout=60)))
    except Exception as error:
        Path(args.out).mkdir(parents=True, exist_ok=True)
        failure = {'success': False, 'error': type(error).__name__ + ': ' + str(error)}
        (Path(args.out) / 'interaction425-report.json').write_text(json.dumps(failure, indent=2))
        print(json.dumps(failure))
        raise
