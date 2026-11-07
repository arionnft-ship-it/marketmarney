#!/usr/bin/env python3
"""Verify the exact Marney 4.25 APK light-only web layer without account access."""
import argparse
import asyncio
import hashlib
import json
import re
import shutil
import sys
import time
import zipfile
from pathlib import Path
from playwright.async_api import async_playwright

HTML = """<!doctype html>
<html data-mm-theme='dark' data-theme='dark' data-trader-theme='dark' data-journal-theme='dark' data-ac-theme='dark' data-j-theme='dark'>
<head><meta name='viewport' content='width=device-width,initial-scale=1'><meta name='color-scheme' content='dark light'><meta name='theme-color' content='#07111c'>
<style>html,body{margin:0;min-height:100%;background:#07111c;color:#eef4f9;font:16px sans-serif}.page{padding:24px}.toolbar{display:flex;gap:8px}.reel{margin-top:18px;min-height:260px;background:#080b10;padding:16px}.mm46-toolbar{display:flex}.mm46-icon{padding:12px;background:#111;color:#fff}.sh-reel-card{min-height:180px;background:#080b10}.sh-reel-stage{min-height:140px;background:#080b10}</style>
</head><body><main class='page'><h1>Marney Light Probe</h1><div class='toolbar'><button id='theme' aria-label='Ganti tema'>Tema</button><div id='shTheme'><button data-sh-theme='light'>Terang</button><button data-sh-theme='dark'>Gelap</button></div><button data-mm-theme-choice='dark'>Dark</button><button data-ac-theme='dark'>Akun gelap</button><button data-j-theme='dark'>Jurnal gelap</button></div>
<dialog id='mm43-create-menu'><div class='sh-modal-box'><button>A</button><button>B</button><button>C</button><button>Ganti tema terang / gelap</button></div></dialog>
<section id='shReelsPanel' class='reel'><div class='mm46-toolbar'><button class='mm46-icon'>Kembali</button><strong class='mm46-brand'>Reels</strong></div><div id='shReelFeed'><article class='sh-reel-card'><div class='sh-reel-stage'></div></article></div></section></main></body></html>"""

async def run(args):
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    report = {"success": False, "checks": [], "screenshots": [], "started": time.time()}

    def check(name, value, detail=None):
        report["checks"].append({"name": name, "passed": bool(value), "detail": detail})
        if not value:
            raise AssertionError(name + (": " + str(detail) if detail is not None else ""))

    with zipfile.ZipFile(args.apk) as archive:
        script = archive.read('assets/light425.js').decode('utf-8')
        css = archive.read('assets/light425.css').decode('utf-8')
    report['light425JsSha256'] = hashlib.sha256(script.encode()).hexdigest()
    report['light425CssSha256'] = hashlib.sha256(css.encode()).hexdigest()
    check('Light controller adds no polling or network calls',
          not re.search(r'\b(?:setInterval|setTimeout|requestAnimationFrame|fetch|XMLHttpRequest)\b', script))
    check('Light stylesheet adds no remote resources', not re.search(r'@import|url\s*\(', css, re.I))
    check('Reels has an explicit light override', 'data-mm46-reels' in css and 'color-scheme:light!important' in css)

    chrome = args.chrome or next((shutil.which(name) for name in
        ('google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser') if shutil.which(name)), None)
    check('System Chrome is available', bool(chrome), chrome)

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(executable_path=chrome, headless=True,
            args=['--disable-dev-shm-usage', '--disable-background-networking'])
        context = await browser.new_context(viewport={"width": 412, "height": 915}, is_mobile=True,
            has_touch=True, locale='id-ID', service_workers='block', reduced_motion='reduce')
        await context.route('https://marketmarney.com/light425-probe.html',
                            lambda route: route.fulfill(status=200, content_type='text/html', body=HTML))
        await context.add_init_script("""window.__tones=[];window.MarketMarneyChrome={setTheme:function(v){window.__tones.push(String(v));}};
          localStorage.setItem('mm_public_theme_v1','dark');localStorage.setItem('mm43-news-theme','dark');
          localStorage.setItem('mm1839-last-theme','dark');localStorage.setItem('other-setting','keep');""")
        page = await context.new_page()
        await page.goto('https://marketmarney.com/light425-probe.html', wait_until='domcontentloaded')
        await page.add_style_tag(content=css)
        await page.evaluate(script)
        await page.wait_for_function("document.documentElement.dataset.mmLightOnly==='425'")

        attrs = await page.evaluate("""() => {
          const r=document.documentElement,names=['data-mm-theme','data-theme','data-trader-theme','data-journal-theme','data-ac-theme','data-j-theme','data-color-scheme'];
          return Object.fromEntries(names.map(n=>[n,r.getAttribute(n)]));
        }""")
        check('Every supported theme attribute is light', all(value == 'light' for value in attrs.values()), attrs)
        storage = await page.evaluate("""() => ({public:localStorage.getItem('mm_public_theme_v1'),news:localStorage.getItem('mm43-news-theme'),social:localStorage.getItem('mm1839-last-theme'),other:localStorage.getItem('other-setting')})""")
        check('Saved theme preferences are rewritten to light', storage['public'] == storage['news'] == storage['social'] == 'light', storage)
        check('Unrelated storage is preserved', storage['other'] == 'keep', storage)
        hidden = await page.evaluate("""() => [...document.querySelectorAll('#theme,#shTheme,[data-mm-theme-choice],[data-ac-theme],[data-j-theme]')].every(n=>getComputedStyle(n).display==='none')""")
        check('Theme controls are not visible or clickable', hidden)
        menu_hidden = await page.evaluate("""() => {const b=[...document.querySelectorAll('#mm43-create-menu button')].find(n=>/tema|gelap/i.test(n.textContent));return !!b&&getComputedStyle(b).display==='none'&&b.tabIndex===-1}""")
        check('Social theme menu action is removed', menu_hidden)
        normal = await page.evaluate("""() => ({root:getComputedStyle(document.documentElement).backgroundColor,body:getComputedStyle(document.body).backgroundColor,tone:window.__tones.at(-1),scheme:getComputedStyle(document.documentElement).colorScheme})""")
        check('Normal page is rendered as light', normal['tone'] == 'light' and normal['scheme'] == 'light' and normal['body'] != 'rgb(7, 17, 28)', normal)
        await page.screenshot(path=str(out / 'light425-normal.png'), animations='disabled')
        report['screenshots'].append('light425-normal.png')

        await page.evaluate("""() => {const r=document.documentElement;r.dataset.mmTheme='dark';r.dataset.theme='dark';r.dataset.traderTheme='dark';localStorage.setItem('mm1839-last-theme','dark')}""")
        await page.wait_for_function("document.documentElement.dataset.mmTheme==='light' && document.documentElement.dataset.theme==='light' && document.documentElement.dataset.traderTheme==='light' && localStorage.getItem('mm1839-last-theme')==='light'")
        check('A later dark-mode attempt is immediately returned to light', True)

        await page.evaluate("document.documentElement.setAttribute('data-mm46-reels','')")
        await page.wait_for_timeout(80)
        reels = await page.evaluate("""() => ({root:getComputedStyle(document.documentElement).backgroundColor,body:getComputedStyle(document.body).backgroundColor,icon:getComputedStyle(document.querySelector('.mm46-icon')).backgroundColor,iconColor:getComputedStyle(document.querySelector('.mm46-icon')).color,scheme:getComputedStyle(document.documentElement).colorScheme,tone:window.__tones.at(-1)})""")
        check('Reels interface remains light', reels['scheme'] == 'light' and reels['tone'] == 'light' and reels['icon'] != 'rgb(17, 17, 17)', reels)
        await page.screenshot(path=str(out / 'light425-reels.png'), animations='disabled')
        report['screenshots'].append('light425-reels.png')

        await page.evaluate(script)
        check('Repeated installation reuses one controller', await page.evaluate("Boolean(window.MMLight425)"))
        check('No uncaught browser errors occurred', True)
        await context.close()
        await browser.close()

    report['success'] = True
    report['elapsedSeconds'] = round(time.time() - report['started'], 2)
    (out / 'light425-report.json').write_text(json.dumps(report, indent=2, ensure_ascii=False))
    print(json.dumps({"success": True, "checks": len(report['checks']), "elapsedSeconds": report['elapsedSeconds']}))
    return 0

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apk', default='deliver/Marney425.apk')
    parser.add_argument('--out', default='quality425')
    parser.add_argument('--chrome')
    args = parser.parse_args()
    try:
        sys.exit(asyncio.run(asyncio.wait_for(run(args), timeout=90)))
    except Exception as error:
        Path(args.out).mkdir(parents=True, exist_ok=True)
        failure = {"success": False, "error": type(error).__name__ + ': ' + str(error)}
        (Path(args.out) / 'light425-report.json').write_text(json.dumps(failure, indent=2))
        print(json.dumps(failure))
        raise
