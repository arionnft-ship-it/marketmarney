#!/usr/bin/env python3
"""Verify Marney 4.26 soft web depth using the exact APK assets."""
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

HTML="""<!doctype html>
<html data-mm-depth="423" data-mm-theme="dark" data-theme="dark">
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light">
<style>
html,body{margin:0;min-height:100%;font:15px sans-serif}
main{padding:22px}.toolbar{display:flex;gap:9px;align-items:center;flex-wrap:wrap}
.panel{margin-top:18px;padding:20px;border:1px solid #444;border-radius:18px}
.button{padding:12px 18px;border:1px solid #999;border-radius:13px}
#theme{padding:12px}.reels{margin-top:18px;padding:18px;min-height:220px}
.mm46-icon,.sh-reel-rail-btn{padding:12px;border-radius:50%}
</style>
</head>
<body>
<main>
<h1>Marney 4.26</h1>
<div class="toolbar">
<button id="theme" aria-label="Ganti tema">Tema</button>
<button data-mm-theme-choice="dark">Gelap</button>
<button id="ordinary">Tombol biasa</button>
</div>
<section class="panel"><h2>Soft 3D</h2><p>Kartu dengan kedalaman tipis.</p><button class="button">Aksi</button></section>
<section class="reels" id="shReelsPanel"><button class="mm46-icon">←</button><button class="sh-reel-rail-btn">♡</button></section>
</main>
<script>window.ordinaryClicks=0;document.getElementById('ordinary').onclick=()=>window.ordinaryClicks++;</script>
</body></html>"""

async def run(args):
    out=Path(args.out)
    out.mkdir(parents=True,exist_ok=True)
    report={"success":False,"checks":[],"screenshots":[],"started":time.time()}

    def check(name,value,detail=None):
        report["checks"].append({"name":name,"passed":bool(value),"detail":detail})
        if not value:
            raise AssertionError(name+(": "+str(detail) if detail is not None else ""))

    with zipfile.ZipFile(args.apk) as archive:
        depth=archive.read("assets/depth423.css").decode("utf-8")
        light=archive.read("assets/light425.css").decode("utf-8")
        soft=archive.read("assets/soft426.css").decode("utf-8")
        controller=archive.read("assets/light425.js").decode("utf-8")

    report["soft426Sha256"]=hashlib.sha256(soft.encode()).hexdigest()
    check("Soft stylesheet has no remote resources",
          not re.search(r"@import|url\s*\(",soft,re.I))
    check("Soft stylesheet adds no animation, perspective or blur",
          not re.search(r"\banimation\s*:|\bperspective\s*:|filter\s*:\s*blur",soft,re.I))
    check("Heavy 4.23 lower-edge shadows are overridden",
          "--mm423-card-shadow" in soft and "0 3px 0" not in soft and "0 8px 16px" not in soft)
    check("Reels controls receive a restrained shadow",
          ".sh-reel-rail-btn" in soft and "0 2px 6px" in soft)

    chrome=args.chrome or next((shutil.which(name) for name in
        ("google-chrome","google-chrome-stable","chromium","chromium-browser") if shutil.which(name)),None)
    check("System Chrome is available",bool(chrome),chrome)

    async with async_playwright() as playwright:
        browser=await playwright.chromium.launch(executable_path=chrome,headless=True,
            args=["--disable-dev-shm-usage","--disable-background-networking"])
        context=await browser.new_context(viewport={"width":412,"height":915},is_mobile=True,
            has_touch=True,locale="id-ID",service_workers="block",reduced_motion="reduce")
        await context.route("https://marketmarney.com/soft426-probe.html",
            lambda route:route.fulfill(status=200,content_type="text/html",body=HTML))
        await context.add_init_script("""window.__tones=[];window.MarketMarneyChrome={setTheme:function(v){window.__tones.push(String(v));}};
          localStorage.setItem('mm_public_theme_v1','dark');localStorage.setItem('mm1839-last-theme','dark');""")
        page=await context.new_page()
        errors=[]
        page.on("pageerror",lambda error:errors.append(str(error)))
        await page.goto("https://marketmarney.com/soft426-probe.html",wait_until="domcontentloaded")
        await page.add_style_tag(content=depth)
        await page.add_style_tag(content=light)
        await page.add_style_tag(content=soft)
        await page.evaluate(controller)
        await page.wait_for_function("document.documentElement.dataset.mmLightOnly==='425'")

        values=await page.evaluate("""() => {
          const root=getComputedStyle(document.documentElement);
          const panel=getComputedStyle(document.querySelector('.panel'));
          const button=getComputedStyle(document.querySelector('.button'));
          return {
            cardVar:root.getPropertyValue('--mm423-card-shadow').trim(),
            controlVar:root.getPropertyValue('--mm423-control-shadow').trim(),
            panelShadow:panel.boxShadow,
            buttonShadow:button.boxShadow,
            body:getComputedStyle(document.body).backgroundColor,
            scheme:root.colorScheme,
            tone:window.__tones.at(-1)
          };
        }""")
        check("The page remains light",
              values["scheme"]=="light" and values["tone"]=="light" and values["body"]!="rgb(7, 17, 28)",values)
        check("Card shadow is soft rather than beveled",
              "3px 0" not in values["cardVar"] and "8px 16px" not in values["cardVar"],values["cardVar"])
        check("Control shadow is a single shallow shadow",
              "0 1px 2px" in values["controlVar"],values["controlVar"])

        hidden=await page.evaluate("""() => [...document.querySelectorAll('#theme,[data-mm-theme-choice]')]
          .every(node=>getComputedStyle(node).display==='none'&&node.tabIndex===-1)""")
        check("Dark-theme controls remain unavailable",hidden)

        await page.click("#ordinary")
        check("Unrelated controls remain clickable",
              await page.evaluate("window.ordinaryClicks===1"))

        await page.screenshot(path=str(out/"soft426-normal.png"),animations="disabled")
        report["screenshots"].append("soft426-normal.png")

        await page.evaluate("""() => {
          const root=document.documentElement;
          root.dataset.mmTheme='dark';
          root.dataset.theme='dark';
          root.dataset.traderTheme='dark';
          localStorage.setItem('mm1839-last-theme','dark');
        }""")
        await page.wait_for_function("""document.documentElement.dataset.mmTheme==='light' &&
          document.documentElement.dataset.theme==='light' &&
          document.documentElement.dataset.traderTheme==='light' &&
          localStorage.getItem('mm1839-last-theme')==='light'""")
        check("A later dark-mode attempt returns to light",True)

        await page.evaluate("document.documentElement.setAttribute('data-mm46-reels','')")
        await page.wait_for_timeout(100)
        reels=await page.evaluate("""() => ({
          scheme:getComputedStyle(document.documentElement).colorScheme,
          root:getComputedStyle(document.documentElement).backgroundColor,
          iconShadow:getComputedStyle(document.querySelector('.mm46-icon')).boxShadow,
          iconBackground:getComputedStyle(document.querySelector('.mm46-icon')).backgroundColor,
          tone:window.__tones.at(-1)
        })""")
        check("Reels chrome remains light and softly elevated",
              reels["scheme"]=="light" and reels["tone"]=="light" and
              reels["iconBackground"]!="rgb(17, 17, 17)",reels)
        check("Reels shadow is not oversized",
              "12px" not in reels["iconShadow"],reels["iconShadow"])
        await page.screenshot(path=str(out/"soft426-reels.png"),animations="disabled")
        report["screenshots"].append("soft426-reels.png")

        check("No uncaught browser errors occurred",not errors,errors)
        await context.close()
        await browser.close()

    report["success"]=True
    report["elapsedSeconds"]=round(time.time()-report["started"],2)
    (out/"soft426-report.json").write_text(json.dumps(report,indent=2,ensure_ascii=False))
    print(json.dumps({"success":True,"checks":len(report["checks"]),"elapsedSeconds":report["elapsedSeconds"]}))
    return 0

if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apk",default="deliver/Marney426.apk")
    parser.add_argument("--out",default="quality426")
    parser.add_argument("--chrome")
    args=parser.parse_args()
    try:
        sys.exit(asyncio.run(asyncio.wait_for(run(args),timeout=90)))
    except Exception as error:
        Path(args.out).mkdir(parents=True,exist_ok=True)
        failure={"success":False,"error":type(error).__name__+": "+str(error)}
        (Path(args.out)/"soft426-report.json").write_text(json.dumps(failure,indent=2))
        print(json.dumps(failure))
        raise
