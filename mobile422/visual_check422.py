"""Focused, anonymous visual verification of the Android 4.22 Home change."""
import asyncio
import hashlib
import json
import re
import shutil
import sys
from pathlib import Path
from urllib.parse import urlsplit

from playwright.async_api import async_playwright


OUT = Path("quality422")
SELECTOR = "#app > .featurestrip.featurestrip-pro"
EXPECTED_CARDS = ["Berita", "Analisa", "Kalender Ekonomi", "Social Marney"]
SNAPSHOT = """() => {
  const visible = n => !!n && !!(n.getBoundingClientRect().width && n.getBoundingClientRect().height)
    && getComputedStyle(n).display !== 'none' && getComputedStyle(n).visibility !== 'hidden';
  const box = n => { if (!n) return null; const r = n.getBoundingClientRect();
    return {top:r.top + scrollY, height:r.height, width:r.width}; };
  const strip = document.querySelector('#app > .featurestrip.featurestrip-pro');
  const hero = document.querySelector('#app > .hero');
  return {
    path:location.pathname, hash:location.hash, theme:document.documentElement.dataset.mmTheme,
    topLabel:document.querySelector('#toplabel')?.textContent.trim(),
    documentHeight:document.documentElement.scrollHeight,
    headerVisible:visible(document.querySelector('.mobilebar')),
    headerText:document.querySelector('.mobile-brand')?.textContent.trim(),
    menuPresent:!!document.querySelector('#mobileToggle'),
    nav:[...document.querySelectorAll('#nav button[data-page]')].map(n=>n.dataset.page),
    activeNav:[...document.querySelectorAll('#nav button[data-page].active')].map(n=>n.dataset.page),
    headings:[...document.querySelectorAll('#app h1,#app h2')].filter(visible).map(n=>n.textContent.trim()),
    stripCount:document.querySelectorAll('#app > .featurestrip.featurestrip-pro').length,
    stripDisplay:strip ? getComputedStyle(strip).display : null,
    stripBox:box(strip), heroBox:box(hero), nextSectionBox:box(strip?.nextElementSibling),
    cardPages:strip ? [...strip.querySelectorAll(':scope > button[data-page]')].map(n=>n.dataset.page) : [],
    cardLabels:strip ? [...strip.querySelectorAll(':scope > button[data-page]')].map(n=>n.getAttribute('aria-label')) : [],
    visibleCards:strip ? [...strip.querySelectorAll(':scope > button[data-page]')].filter(visible).length : 0,
    styleCopies:document.querySelectorAll('#mm422-home').length,
    horizontalOverflow:document.documentElement.scrollWidth > innerWidth + 1
  };
}"""


def exact_home_script():
    source = Path("android422/app/src/main/java/com/marketmarney/mobile/MainActivity.java")
    text = source.read_text()
    values = [json.loads(value) for value in re.findall(r'\bhomeCards\s*=\s*("(?:[^"\\]|\\.)*")\s*;', text)]
    scripts = [value for value in values if value]
    assert len(scripts) == 1, "Expected one exact nonempty homeCards Java string"
    script = scripts[0]
    assert "#app > .featurestrip.featurestrip-pro{display:none!important}" in script
    return script, hashlib.sha256(source.read_bytes()).hexdigest()


def verify_home(state, baseline):
    assert state["stripCount"] == 1, "The known Home wrapper is missing or duplicated"
    assert state["cardPages"] == EXPECTED_CARDS, "Unexpected Home card composition"
    assert state["stripDisplay"] == "none", "Home card wrapper remains displayed"
    assert state["stripBox"]["height"] == 0 and state["stripBox"]["width"] == 0, "Hidden wrapper still occupies layout space"
    assert state["visibleCards"] == 0, "A Home shortcut card remains visible"
    assert state["styleCopies"] == 1, "Home styling is missing or duplicated"
    assert state["headerVisible"] and state["menuPresent"], "Mobile header/menu disappeared"
    assert state["headerText"] == baseline["headerText"], "Header text changed"
    assert state["nav"] == baseline["nav"], "Main navigation destinations changed"
    assert "HEADLINE MARKET" in state["headings"] and "BERITA TERBARU" in state["headings"], "Home news sections disappeared"
    assert state["activeNav"] == ["Beranda"], "Home navigation is not active"


async def run(result):
    script, digest = exact_home_script()
    result["mainActivitySha256"] = digest
    result["injectedScriptSha256"] = hashlib.sha256(script.encode()).hexdigest()
    chrome = shutil.which("google-chrome") or shutil.which("google-chrome-stable") or shutil.which("chromium") or shutil.which("chromium-browser")
    if not chrome:
        raise RuntimeError("No system Chrome/Chromium executable available")
    result["browserExecutable"] = chrome
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(executable_path=chrome, headless=True)
        context = await browser.new_context(
            viewport={"width": 412, "height": 915}, device_scale_factor=1,
            is_mobile=True, has_touch=True, locale="id-ID", service_workers="block",
            user_agent=pw.devices["Pixel 7"]["user_agent"] + " MarketMarneyAndroid/4.22 AppShell",
        )
        await context.add_init_script("try{localStorage.setItem('mm_public_theme_v1','light')}catch(e){}")

        async def route(request_route):
            request = request_route.request
            url = urlsplit(request.url)
            if request.method not in ("GET", "HEAD"):
                result["blockedWrites"] += 1
                await request_route.abort()
                return
            if "/api/auth/" in url.path or "logout" in url.path.lower():
                result["blockedAuthReads"] += 1
                await request_route.abort()
                return
            if request.is_navigation_request() and request.resource_type == "document" and request.frame.parent_frame is None:
                result["mainDocuments"] += 1
            await request_route.continue_()

        await context.route("**/*", route)
        await context.route_web_socket("**/*", lambda socket: socket.close())
        page = await context.new_page()
        page.set_default_timeout(12000)
        page.on("pageerror", lambda error: result["pageErrors"].append(str(error)[:250]))
        response = await page.goto("https://marketmarney.com/index.html", wait_until="domcontentloaded", timeout=40000)
        result["httpStatus"] = response.status if response else None
        assert response and response.status == 200, "Home document did not return HTTP 200"
        await page.locator(SELECTOR).wait_for(state="visible")
        await page.wait_for_function("typeof document.querySelector('#nav button[data-page=\"Beranda\"]')?.onclick === 'function'")
        await page.wait_for_timeout(700)
        before = await page.evaluate(SNAPSHOT)
        result["beforeLight"] = before
        assert before["cardPages"] == EXPECTED_CARDS and before["visibleCards"] == 4, "Baseline does not contain the four requested cards"
        assert before["stripBox"]["height"] > 0, "Baseline wrapper has no height"
        assert before["theme"] == "light", "Light baseline theme was not applied"

        async def anchor_shot(filename):
            # Keep the hero-to-content junction in view to show the collapsed gap.
            await page.evaluate("() => {const hero=document.querySelector('#app > .hero');if(hero)window.scrollTo(0,Math.max(0,hero.getBoundingClientRect().bottom+scrollY-180))}")
            await page.wait_for_timeout(150)
            await page.screenshot(path=str(OUT / filename), animations="disabled", timeout=15000)

        await anchor_shot("home422-before-light.png")
        await page.evaluate("(function(){" + script + "})()")
        await page.wait_for_timeout(150)
        result["afterLight"] = await page.evaluate(SNAPSHOT)
        verify_home(result["afterLight"], before)
        await anchor_shot("home422-after-light.png")

        # Native Home/Market navigation uses these existing sidebar click handlers.
        # No CSS is changed to expose the collapsed sidebar.
        async def destination(label):
            button = page.locator('#nav button[data-page="' + label + '"]').first
            await button.evaluate("n=>{if(typeof n.onclick!=='function')throw Error('Navigation handler is not ready');n.click()}")
            await page.wait_for_function("label => document.querySelector('#nav button[data-page=\"'+label+'\"]')?.classList.contains('active')", arg=label)
            await page.wait_for_timeout(250)
            state = await page.evaluate(SNAPSHOT)
            assert state["activeNav"] == [label], "Wrong active destination: " + label
            assert state["nav"] == before["nav"] and state["headerVisible"], "Navigation/header changed on " + label
            return state

        initial_documents = result["mainDocuments"]
        for label in ["Market Live", "Analisa", "Kalender Ekonomi"]:
            route_state = await destination(label)
            assert route_state["stripCount"] == 0, "Home shortcut container appears on " + label
            assert route_state["headings"], "Destination has no visible heading: " + label
            result["destinations"][label] = route_state
            home_state = await destination("Beranda")
            verify_home(home_state, before)
            result["returnsHome"][label] = home_state
        result["sameDocumentNavigation"] = result["mainDocuments"] == initial_documents
        assert result["sameDocumentNavigation"], "Expected navigation to reuse the Home document"

        dark = page.locator('[data-mm-theme-choice="dark"]').first
        await dark.evaluate("n=>n.click()")
        await page.wait_for_function("document.documentElement.dataset.mmTheme === 'dark'")
        await page.wait_for_timeout(200)
        result["afterDark"] = await page.evaluate(SNAPSHOT)
        verify_home(result["afterDark"], before)
        # The native adapt callback can run twice; a second exact injection is safe.
        await page.evaluate("(function(){" + script + "})()")
        result["afterRepeatedAdapt"] = await page.evaluate(SNAPSHOT)
        verify_home(result["afterRepeatedAdapt"], before)
        result["screenshots"] = ["home422-before-light.png", "home422-after-light.png"]
        result["passed"] = True
        await context.close()
        await browser.close()


async def main():
    OUT.mkdir(exist_ok=True, parents=True)
    result = {
        "scope": "Anonymous public browser preview of the exact Android homeCards script; GET/HEAD only; no auth; no production writes",
        "passed": False, "blockedWrites": 0, "blockedAuthReads": 0, "mainDocuments": 0,
        "pageErrors": [], "destinations": {}, "returnsHome": {},
    }
    try:
        await asyncio.wait_for(run(result), timeout=150)
    except Exception as error:
        result["error"] = type(error).__name__ + ": " + str(error)[:1000]
    finally:
        (OUT / "home422-visual.json").write_text(json.dumps(result, indent=2, ensure_ascii=False))
    print(json.dumps(result, ensure_ascii=False))
    return 0 if result["passed"] else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
