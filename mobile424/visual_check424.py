#!/usr/bin/env python3
"""Focused browser verification for the 4.24 page-tone bridge."""
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

HTML = """<!doctype html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'>
<style>html,body{margin:0;min-height:100%;background:#fff;color:#18283a;font:16px sans-serif}main{padding:32px}.mock{position:fixed;left:0;right:0;bottom:0;height:74px;background:inherit;border-top:1px solid #bbb;display:flex;align-items:center;justify-content:space-around}.chip{padding:12px 18px;border:1px solid #aaa;border-radius:16px}</style></head>
<body><main><h1>Marney 4.24</h1><p>Probe lokal untuk sinkronisasi warna menu.</p></main><div class='mock'><span class='chip'>Beranda</span><span class='chip'>Berita</span><span class='chip'>Reels</span></div></body></html>"""

async def run(args):
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    report = {"success": False, "checks": [], "screenshots": [], "started": time.time()}

    def check(name, value, detail=None):
        report["checks"].append({"name": name, "passed": bool(value), "detail": detail})
        if not value:
            raise AssertionError(name + (": " + str(detail) if detail is not None else ""))

    with zipfile.ZipFile(args.apk) as archive:
        script = archive.read("assets/chrome424.js").decode("utf-8")
    report["chrome424Sha256"] = hashlib.sha256(script.encode()).hexdigest()
    check("Theme bridge contains no polling or network calls",
          not re.search(r"\b(?:setInterval|setTimeout|requestAnimationFrame|fetch|XMLHttpRequest)\b", script))
    check("Theme bridge is mutation-driven", "MutationObserver" in script)

    chrome = args.chrome or next((shutil.which(name) for name in
        ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser") if shutil.which(name)), None)
    check("System Chrome is available", bool(chrome), chrome)

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(executable_path=chrome, headless=True,
            args=["--disable-dev-shm-usage", "--disable-background-networking"])
        context = await browser.new_context(viewport={"width": 412, "height": 915}, is_mobile=True,
            has_touch=True, locale="id-ID", service_workers="block")
        await context.route("https://marketmarney.com/theme-probe.html",
            lambda route: route.fulfill(status=200, content_type="text/html", body=HTML))
        await context.add_init_script("window.__mmTones=[];window.MarketMarneyChrome={setTheme:function(v){window.__mmTones.push(String(v));document.documentElement.dataset.probeTone=String(v)}};")
        page = await context.new_page()
        await page.goto("https://marketmarney.com/theme-probe.html", wait_until="domcontentloaded")
        await page.evaluate(script)
        await page.wait_for_function("window.__mmTones.at(-1)==='light'")
        check("Light page reports light chrome", await page.evaluate("window.__mmTones.at(-1)==='light'"))
        await page.screenshot(path=str(out / "chrome424-light.png"), animations="disabled")
        report["screenshots"].append("chrome424-light.png")

        await page.evaluate("document.documentElement.dataset.mmTheme='dark'")
        await page.wait_for_function("window.__mmTones.at(-1)==='dark'")
        check("Dark theme reports dark chrome", True)

        await page.evaluate("document.documentElement.dataset.mmTheme='light'")
        await page.wait_for_function("window.__mmTones.at(-1)==='light'")
        await page.evaluate("document.documentElement.setAttribute('data-mm46-reels','')")
        await page.wait_for_function("window.__mmTones.at(-1)==='dark'")
        check("Reels overrides a light page with dark chrome", True)
        await page.evaluate("document.body.style.background='#050505';document.body.style.color='#fff'")
        await page.screenshot(path=str(out / "chrome424-reels.png"), animations="disabled")
        report["screenshots"].append("chrome424-reels.png")

        await page.evaluate("document.documentElement.removeAttribute('data-mm46-reels')")
        await page.wait_for_function("window.__mmTones.at(-1)==='light'")
        check("Leaving Reels restores the page theme", True)

        await page.evaluate("document.documentElement.removeAttribute('data-mm-theme');document.body.style.background='rgb(9,20,32)'")
        await page.wait_for_function("window.__mmTones.at(-1)==='dark'")
        check("Computed dark background is detected without a theme attribute", True)

        await page.evaluate(script)
        await page.evaluate("window.__mmTones=[]")
        await page.evaluate("document.body.style.background='rgb(255,255,255)'")
        await page.wait_for_function("window.__mmTones.length===1 && window.__mmTones[0]==='light'")
        await page.wait_for_timeout(120)
        check("Repeated installation does not duplicate observers", await page.evaluate("window.__mmTones.length===1"),
              await page.evaluate("window.__mmTones"))

        await context.close()
        await browser.close()

    report["success"] = True
    report["elapsedSeconds"] = round(time.time() - report["started"], 2)
    (out / "chrome424-report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False))
    print(json.dumps({"success": True, "checks": len(report["checks"]), "elapsedSeconds": report["elapsedSeconds"]}))
    return 0

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apk", default="deliver/Marney424.apk")
    parser.add_argument("--out", default="quality424")
    parser.add_argument("--chrome")
    args = parser.parse_args()
    try:
        sys.exit(asyncio.run(asyncio.wait_for(run(args), timeout=90)))
    except Exception as error:
        Path(args.out).mkdir(parents=True, exist_ok=True)
        failure = {"success": False, "error": type(error).__name__ + ": " + str(error)}
        (Path(args.out) / "chrome424-report.json").write_text(json.dumps(failure, indent=2))
        print(json.dumps(failure))
        raise
