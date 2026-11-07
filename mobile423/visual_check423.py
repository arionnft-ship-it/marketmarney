"""Focused visual verification of the exact Marney 4.23 APK.

Public Home is read anonymously with GET/HEAD only. Packaged News, Social,
Messenger, Reels, Profile and Group use original APK HTML/scripts plus explicitly
synthetic responses. No account, message, upload or production mutation occurs.
The seven screenshots are internal QA evidence, not user-content deliverables.
"""
import argparse
import asyncio
import hashlib
import importlib.util
import json
import re
import shutil
import sys
import time
import zipfile
from pathlib import Path
from types import SimpleNamespace
from urllib.parse import parse_qs, urlsplit

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "https://marketmarney.com"
GROUP_ID = "12345678-1234-4230-8000-123456789abc"


def load_fixture_helpers():
    # The imported module's regression runner is protected by __main__.
    candidates = [ROOT / "mobile420/test_repair420.py",
                  ROOT.parent / "marney420/mobile420/test_repair420.py"]
    source = next((p for p in candidates if p.is_file()), None)
    if source is None:
        raise FileNotFoundError("The reviewed 4.20 Assets/FixtureRouter helper is missing")
    spec = importlib.util.spec_from_file_location("marney420_fixture_helpers", source)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def home_script(apk):
    source = ROOT / "android423/app/src/main/java/com/marketmarney/mobile/MainActivity.java"
    values = [json.loads(value) for value in
              re.findall(r'\bhomeCards\s*=\s*("(?:[^"\\]|\\.)*")\s*;', source.read_text())]
    scripts = [value for value in values if value]
    assert len(scripts) == 1, "Expected the retained exact Home-card script"
    script = scripts[0]
    if apk:
        with zipfile.ZipFile(apk) as archive:
            assert any(script.encode() in archive.read(name) for name in archive.namelist()
                       if name.endswith(".dex")), "Home script differs from the compiled APK"
    return script


def make_router_class(helper):
    class VisualRouter(helper.FixtureRouter):
        """Extend existing contracts only for the visible Profile/Group/News data."""
        async def handle(self, route):
            request = route.request
            url = urlsplit(request.url)
            if (request.method not in ("GET", "HEAD") or url.scheme != "https" or
                    url.hostname != "marketmarney.com" or url.port not in (None, 443)):
                return await super().handle(route)
            profile = {**helper.PROFILE, "postsCount": 2,
                       "joinedAt": helper.FIXTURE_TIME - 86400000}
            group = {"id": GROUP_ID, "name": "Studio Uji · simulasi QA",
                     "description": "Percakapan sintetis untuk memeriksa tampilan aplikasi.",
                     "owner": "qa_other", "ownerDisplayName": "Rekan Uji",
                     "members": 2, "visibility": "public", "joined": True,
                     "role": "member", "canModerate": False, "canEditPhoto": False,
                     "avatarUrl": None, "pinned": None,
                     "lastMessage": "Contoh pesan untuk pemeriksaan visual."}
            fixtures = {
                "/api/content": {"articles": [
                    {"id": "qa-news-1", "title": "SIMULASI QA — Membaca pergerakan emas",
                     "cat": "Emas", "summary": "Contoh artikel sintetis untuk pemeriksaan kartu, tipografi, dan tombol aplikasi. Bukan berita pasar aktual.",
                     "date": "2026-11-08", "source": "Studio Uji", "status": "published",
                     "img": "/qa-fixture/chart.svg"},
                    {"id": "qa-news-2", "title": "SIMULASI QA — Mengenal pasar saham",
                     "cat": "Saham", "summary": "Materi contoh pengujian, bukan rekomendasi transaksi.",
                     "date": "2026-11-07", "source": "Studio Uji", "status": "published"},
                    {"id": "qa-news-3", "title": "SIMULASI QA — Catatan ekonomi",
                     "cat": "Ekonomi", "summary": "Data lokal untuk pemeriksaan antarmuka.",
                     "date": "2026-11-06", "source": "Studio Uji", "status": "published"},
                ]},
                "/api/trader-profiles/public": {"profile": profile, "posts": helper.POSTS[:2]},
                "/api/trader-follow/status": {"loggedIn": True, "isSelf": True,
                    "isFollowing": False, "mutual": False, "followers": 12, "following": 4},
                "/api/trader-connect/groups": {"mine": [group], "discover": [group]},
                "/api/trader-connect/group-messages": {"group": group, "items": [
                    {"id": "qa-group-message-1", "username": "qa_other", "displayName": "Rekan Uji",
                     "body": "Ini pesan simulasi QA untuk memeriksa keterbacaan kartu percakapan.",
                     "createdAt": helper.FIXTURE_TIME, "mine": False, "avatarUrl": None,
                     "groupRole": "member"},
                    {"id": "qa-group-message-2", **helper.SESSION_USER,
                     "body": "Tidak ada pesan yang dikirim ke server selama pemeriksaan ini.",
                     "createdAt": helper.FIXTURE_TIME + 60000, "mine": True, "avatarUrl": None,
                     "groupRole": "member"},
                ]},
                "/api/trader-connect/groups/detail": {"group": group},
            }
            if url.path not in fixtures:
                return await super().handle(route)
            # Fail closed if a profile/group request leaves the explicit fixture identity.
            query = parse_qs(url.query)
            if url.path in ("/api/trader-profiles/public", "/api/trader-follow/status"):
                assert query.get("user") == ["qa_fixture"], query
            if url.path in ("/api/trader-connect/group-messages", "/api/trader-connect/groups/detail"):
                assert query.get("id") == [GROUP_ID], query
            self.calls[url.path] += 1
            self.requests.append({"method": request.method, "path": url.path,
                                  "type": request.resource_type, "ordinal": self.calls[url.path]})
            await self.json_response(route, fixtures[url.path])
    return VisualRouter


PROBE = """selector => {
  const n=[...document.querySelectorAll(selector)].find(n=>{
    const r=n.getBoundingClientRect(),s=getComputedStyle(n);
    return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';
  });
  if(!n)return null;
  const r=n.getBoundingClientRect(),s=getComputedStyle(n),h=document.documentElement;
  return {selector,tag:n.tagName,id:n.id,classes:n.className,
    text:n.textContent.trim().slice(0,160),width:r.width,height:r.height,left:r.left,right:r.right,
    background:s.backgroundImage,backgroundColor:s.backgroundColor,shadow:s.boxShadow,
    color:s.color,fontSize:s.fontSize,transform:s.transform,opacity:s.opacity,
    pointerEvents:s.pointerEvents,disabled:!!n.disabled,
    overflowPx:Math.max(0,h.scrollWidth-innerWidth),depth:h.dataset.mmDepth,
    page:h.dataset.mmDepthPage,tone:h.dataset.mmDepthTone,
    publicTheme:h.dataset.mmTheme,newsTheme:h.dataset.theme,traderTheme:h.dataset.traderTheme,
    reels:h.hasAttribute('data-mm46-reels'),styleCopies:document.querySelectorAll('#mm423-depth').length};
}"""


class Preview:
    def __init__(self, assets, helper, output, report, home):
        self.assets, self.helper, self.output, self.report, self.home = assets, helper, output, report, home
        self.css = assets.files["depth423.css"].decode()
        self.script = assets.files["depth423.js"].decode()

    def check(self, label, condition, detail=None):
        record = {"name": label, "passed": bool(condition)}
        if detail is not None:
            record["detail"] = detail
        self.report["checks"].append(record)
        if not condition:
            raise AssertionError(label + (": " + str(detail) if detail is not None else ""))

    async def wait(self, page, expression, timeout=7000):
        # Evaluate via the browser protocol: preserve the packaged no-unsafe-eval CSP.
        deadline = time.monotonic() + timeout / 1000
        while time.monotonic() < deadline:
            if await asyncio.wait_for(page.evaluate("() => Boolean(" + expression + ")"), timeout=3):
                return
            await page.wait_for_timeout(80)
        raise TimeoutError("Condition did not become ready: " + expression)

    async def adapt(self, page):
        self.check("Adaptation stays on the owned HTTPS origin",
                   urlsplit(page.url).scheme == "https" and urlsplit(page.url).hostname == "marketmarney.com")
        await page.evaluate("""() => {
          window.MarketMarneyApp={platform:'android',version:'4.23'};
          document.documentElement.dataset.mmAndroid='423';
          if(!document.getElementById('mm43-common')){const s=document.createElement('style');
            s.id='mm43-common';s.textContent='#mmInstall{display:none!important}';document.head.append(s);}
        }""")
        path = urlsplit(page.url).path
        if path in ("/", "/index.html"):
            await page.evaluate("(function(){" + self.home + "})()")
        await page.evaluate(self.assets.files["branding417.js"].decode())
        if path in ("/beranda-trader.html", "/profil.html", "/grup-trader.html"):
            if not await page.evaluate("Boolean(window.__mm411BundledReady)"):
                css = "\n".join(self.assets.files[n].decode() for n in
                                  ("social44.css", "reels46.css", "navigation47.css", "premium411.css"))
                await page.evaluate("""css=>{let s=document.getElementById('mm43-social-style');
                  if(!s){s=document.createElement('style');s.id='mm43-social-style';document.head.append(s)}
                  s.textContent=css;s.dataset.revision='423';}""", css)
                for name in ("profile49.js", "social44.js", "reels46.js", "navigation47.js"):
                    await page.evaluate(self.assets.files[name].decode())
        await page.evaluate(self.script)
        installed = await page.evaluate("css=>window.MMDepth423.install(css)", self.css)
        self.check("Exact packaged depth stylesheet installs", installed is True)
        await page.wait_for_timeout(100)
        intact = await page.evaluate("css=>document.getElementById('mm423-depth')?.textContent===css", self.css)
        self.check("Rendered stylesheet equals exact APK bytes", intact)

    async def surface(self, page, label, selector, gradient=False, clickable=False):
        state = await page.evaluate(PROBE, selector)
        self.check(label + " is visible", state is not None)
        self.check(label + " receives the new material", state["depth"] == "423" and state["shadow"] != "none", state)
        self.check(label + " fits the viewport", state["overflowPx"] <= 1, state["overflowPx"])
        self.check(label + " keeps one depth stylesheet", state["styleCopies"] == 1)
        if gradient:
            self.check(label + " has a dimensional face", "gradient(" in state["background"], state["background"])
        if clickable:
            self.check(label + " remains an enabled control",
                       not state["disabled"] and state["pointerEvents"] != "none" and float(state["opacity"]) > 0)
        self.report["surfaces"][label] = state
        return state

    async def shot(self, page, filename):
        await page.screenshot(path=str(self.output / filename), animations="disabled", timeout=12000)
        self.report["screenshots"].append(filename)

    async def repeated_install(self, page):
        await page.evaluate("css=>window.MMDepth423.install(css)", self.css)
        result = await page.evaluate("""css=>{
          const root=document.documentElement,style=document.getElementById('mm423-depth');
          const observer=new MutationObserver(()=>{});
          observer.observe(root,{attributes:true,attributeFilter:['data-mm-depth','data-mm-depth-page','data-mm-depth-tone']});
          observer.observe(document.head,{childList:true});observer.observe(style,{childList:true,subtree:true});
          const ok=window.MMDepth423.install(css),mutations=observer.takeRecords().length;observer.disconnect();
          return {ok,mutations,sameNode:style===document.getElementById('mm423-depth'),copies:document.querySelectorAll('#mm423-depth').length};
        }""", self.css)
        self.check("Repeated adaptation adds no DOM work", result == {"ok": True, "mutations": 0, "sameNode": True, "copies": 1}, result)

    async def public_home(self, browser):
        context = await browser.new_context(viewport={"width": 412, "height": 915}, device_scale_factor=1,
            is_mobile=True, has_touch=True, locale="id-ID", reduced_motion="reduce", service_workers="block",
            user_agent="Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 MarketMarneyAndroid/4.23 AppShell")
        public = {"mainDocuments": 0, "blockedWrites": [], "blockedAccountReads": [],
                  "guestMode": False, "syntheticGuestReads": [], "pageErrors": []}
        self.report["publicHome"] = public

        async def route(r):
            req, u = r.request, urlsplit(r.request.url)
            if req.method not in ("GET", "HEAD"):
                public["blockedWrites"].append({"method": req.method, "path": u.path})
                return await r.abort()
            if public["guestMode"] and u.hostname == "marketmarney.com" and u.path.startswith("/api/"):
                public["syntheticGuestReads"].append(u.path)
                # These pages must never read a real account or journal. Unknown
                # private reads receive an explicit guest denial, not invented data.
                if u.path == "/api/community/status":
                    return await r.fulfill(status=200, content_type="application/json",
                        body=json.dumps({"user": None, "registrationEnabled": False}))
                if u.path == "/api/auth/google/config":
                    return await r.fulfill(status=200, content_type="application/json",
                        body=json.dumps({"enabled": False}))
                return await r.fulfill(status=401, content_type="application/json",
                    body=json.dumps({"error": "Guest-only visual QA; no account data"}))
            if u.path.startswith(("/api/auth/", "/api/community/", "/api/trader-")) or "logout" in u.path.lower():
                public["blockedAccountReads"].append(u.path)
                return await r.abort()
            if req.is_navigation_request() and req.resource_type == "document" and req.frame.parent_frame is None:
                public["mainDocuments"] += 1
            # Match the APK's exact public logo aliases; other public resources stay live.
            if u.hostname == "marketmarney.com" and u.path in self.helper.BRAND_ALIASES:
                return await r.fulfill(content_type="image/png", body=self.assets.files["brand417/logo.png"])
            await r.continue_()

        await context.route("**/*", route)
        await context.route_web_socket("**/*", lambda socket: socket.close())
        await context.add_init_script("try{localStorage.setItem('mm_public_theme_v1','light')}catch(e){}")
        page = await context.new_page()
        page.on("pageerror", lambda error: public["pageErrors"].append(str(error)[:400]))
        try:
            response = await page.goto(ORIGIN + "/index.html", wait_until="domcontentloaded", timeout=40000)
            self.check("Public Home returns HTTP 200", response is not None and response.status == 200)
            await self.wait(page, "typeof document.querySelector('#nav button[data-page=\"Beranda\"]')?.onclick==='function'")
            await self.adapt(page)
            baseline_nav = await page.locator("#nav button[data-page]").evaluate_all("nodes=>nodes.map(n=>n.dataset.page)")
            light = await self.surface(page, "Home light hero", "#app > .hero-premium", gradient=True)
            await self.surface(page, "Home amber action", "#app .button:not(.outline)", gradient=True, clickable=True)
            await self.shot(page, "depth423-home-light.png")

            async def assert_removed():
                value = await page.evaluate("""() => {const n=document.querySelector('#app>.featurestrip.featurestrip-pro');
                  return !!n&&getComputedStyle(n).display==='none'&&n.getBoundingClientRect().height===0;}""")
                self.check("The four removed Home cards stay collapsed", value)

            await assert_removed()
            await page.locator('[data-mm-theme-choice="dark"]').first.evaluate("n=>n.click()")
            await self.wait(page, "document.documentElement.dataset.mmTheme==='dark'")
            dark = await self.surface(page, "Home dark hero", "#app > .hero-premium", gradient=True)
            self.check("Existing public theme control updates the material", light["background"] != dark["background"])
            await self.shot(page, "depth423-home-dark.png")
            routes = [
                ("Market Live", ".mm85-tabs", ".mm85-tab.active"),
                ("Analisa", ".mm87-panel", None),
                ("Kalender Ekonomi", ".mm88-desk", ".mm88-buttons button.active"),
                ("Watchlist", ".mm86-panel", None),
                ("Utilities", "#app>.panel", "#balance"),
                ("MarketMarney TV", ".mm-tv-card,.mm-tv-filters button.active", None),
            ]
            documents = public["mainDocuments"]
            for label, selector, control in routes:
                await page.locator('#nav button[data-page="' + label + '"]').evaluate("n=>{if(typeof n.onclick!=='function')throw Error('Missing navigation handler');n.click()}")
                await self.wait(page, "document.querySelector('#nav button[data-page=" + json.dumps(label) + "]')?.classList.contains('active')")
                await page.wait_for_timeout(150)
                await self.surface(page, label + " material", selector)
                if control:
                    await self.surface(page, label + " control", control, clickable=True)
                self.check(label + " retains main navigation",
                           await page.locator("#nav button[data-page]").evaluate_all("nodes=>nodes.map(n=>n.dataset.page)") == baseline_nav)
            await page.locator('#nav button[data-page="Beranda"]').evaluate("n=>n.click()")
            await self.wait(page, "!!document.querySelector('#app>.hero-premium')")
            await assert_removed()
            self.check("Public menu navigation reuses the document", public["mainDocuments"] == documents)
            await self.repeated_install(page)

            # Account and Journal use two additional theme attributes. Only their
            # public guest cards are examined; all API responses above stay local.
            public["guestMode"] = True
            guest_pages = [
                ("/akun.html", "Account", ".card", "traderTheme", "data-ac-theme", "dark", "light"),
                ("/journal.html", "Journal", "#authCard", "journalTheme", "data-j-theme", "light", "dark"),
            ]
            for path, label, selector, attribute, button_attr, first, second in guest_pages:
                response = await page.goto(ORIGIN + path, wait_until="domcontentloaded", timeout=30000)
                self.check(label + " public guest document loads", response is not None and response.status == 200)
                await page.locator(selector).first.wait_for(state="visible", timeout=10000)
                await self.adapt(page)
                await page.locator('[' + button_attr + '="' + first + '"]').first.evaluate("n=>n.click()")
                await self.wait(page, "document.documentElement.dataset[" + json.dumps(attribute) + "]===" + json.dumps(first))
                before = await self.surface(page, label + " " + first + " guest card", selector, gradient=True)
                await page.locator('[' + button_attr + '="' + second + '"]').first.evaluate("n=>n.click()")
                await self.wait(page, "document.documentElement.dataset[" + json.dumps(attribute) + "]===" + json.dumps(second))
                after = await self.surface(page, label + " " + second + " guest card", selector, gradient=True)
                self.check(label + " existing theme control changes the material", before["background"] != after["background"])
                for state in (before, after):
                    def rgb(value):
                        match = re.search(r"rgba?\(([^)]+)\)", value)
                        return [float(n) / 255 for n in re.findall(r"[\d.]+", match[1])[:3]] if match else None
                    def luminance(parts):
                        linear = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in parts]
                        return sum(a * b for a, b in zip(linear, (0.2126, 0.7152, 0.0722)))
                    foreground, face = rgb(state["color"]), rgb(state["background"])
                    self.check(label + " material exposes inspectable text and face colors", foreground is not None and face is not None)
                    a, b = luminance(foreground), luminance(face)
                    ratio = (max(a, b) + 0.05) / (min(a, b) + 0.05)
                    self.check(label + " inherited text contrasts with the gradient's first face", ratio >= 3, round(ratio, 2))
            self.check("Public preview has no uncaught script error", not public["pageErrors"], public["pageErrors"])
        finally:
            await context.close()

    async def packaged(self, browser):
        context = await browser.new_context(viewport={"width": 412, "height": 915}, device_scale_factor=1,
            is_mobile=True, has_touch=True, locale="id-ID", reduced_motion="reduce", service_workers="block",
            user_agent="Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 MarketMarneyAndroid/4.23 AppShell")
        router = make_router_class(self.helper)(self.assets, "healthy")
        await context.route("**/*", router.handle)
        await context.route_web_socket("**/*", router.websocket)
        page = await context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)[:500]))
        page.on("requestfailed", router.on_failed)

        async def open_page(path, ready):
            response = await page.goto(ORIGIN + path, wait_until="domcontentloaded", timeout=12000)
            self.check("Packaged document loads: " + path.split("?")[0], response is not None and response.status == 200)
            await self.wait(page, ready)
            await self.adapt(page)

        try:
            await open_page("/__android43/news", "document.querySelectorAll('#list article').length===3")
            dark = await self.surface(page, "News dark card", "#list article.featured", gradient=True)
            await self.surface(page, "News inset search", ".search", gradient=True)
            await self.shot(page, "depth423-news.png")
            await page.locator("#theme").click()
            await self.wait(page, "document.documentElement.dataset.theme==='light'")
            light = await self.surface(page, "News light card", "#list article.featured", gradient=True)
            self.check("News theme control changes the material", light["background"] != dark["background"])
            await page.locator("#search").fill("emas")
            await self.wait(page, "document.querySelectorAll('#list article').length===1")
            await page.locator("#search").fill("")
            await page.locator("#filters .chip").filter(has_text=re.compile(r"^Saham$")).click()
            await self.wait(page, "document.querySelectorAll('#list article').length===1 && document.querySelector('#list article').textContent.includes('saham')")
            self.check("News search and category controls still operate", True)

            await open_page("/beranda-trader.html", "document.documentElement.dataset.mmAuthState==='authenticated' && document.querySelectorAll('#shFeed .sh-post').length===2 && !!window.__mm411BundledReady")
            await self.surface(page, "Social feed card", "#shFeed .sh-post", gradient=True)
            await self.surface(page, "Social selected navigation", '.mm44-nav-button[aria-pressed="true"]', gradient=True, clickable=True)
            await self.shot(page, "depth423-social.png")
            await page.locator('#mm44-social-header .mm44-nav-button[aria-label="Reels"]').click()
            await self.wait(page, "document.documentElement.hasAttribute('data-mm46-reels') && !!document.querySelector('#shReelFeed .sh-friend-empty')")
            await self.surface(page, "Reels selected navigation", '.mm44-nav-button[aria-pressed="true"]', gradient=True, clickable=True)
            self.check("Reels opens the existing content area", await page.locator("#shReelFeed").is_visible())
            await page.locator('#mm44-social-header .mm44-nav-button[aria-label="Pesan"]').click()
            await self.wait(page, "document.documentElement.dataset.mm44View==='messages' && !document.getElementById('shMessengerPane').hidden")
            await self.surface(page, "Messenger surface", "#shMessengerPane", gradient=True)
            await self.shot(page, "depth423-messenger.png")
            await page.locator("#shMsgClose").click()
            await page.locator('#mm44-social-header .mm44-nav-button[aria-label="Linimasa"]').click()
            await page.locator('#mm44-social-header button[aria-label="Menu Social Marney"]').click()
            await page.locator("#mm44-create-menu [data-mm420-account]").click()
            await self.wait(page, "document.getElementById('shMobileAccountDialog').open")
            await self.surface(page, "Account drawer", "#shMobileAccountDialog", gradient=True)
            await page.locator("#shMobileAccountClose").click()
            await self.repeated_install(page)

            await open_page("/grup-trader.html?group=" + GROUP_ID,
                            "!document.getElementById('gmRoom').hidden && document.querySelectorAll('#gmMessages .gm-msg').length===2")
            await self.surface(page, "Group room header", ".gm-room-head", gradient=True)
            await self.surface(page, "Group message bubble", ".gm-bubble")
            await self.surface(page, "Group inset composer", "#gmBody", gradient=True, clickable=True)
            await page.locator("#gmBody").fill("Teks uji lokal; tidak dikirim.")
            self.check("Group input accepts text without sending it", await page.locator("#gmBody").input_value() == "Teks uji lokal; tidak dikirim.")
            await self.shot(page, "depth423-group.png")
            await page.locator("#gmBody").fill("")

            await open_page("/profil.html?user=qa_fixture",
                            "document.getElementById('mm36PublicName').textContent.includes('Studio Uji') && document.querySelectorAll('#mm36PublicPosts .mm36-post').length===2")
            await self.wait(page, "!!document.querySelector('.mm44-profile-header')")
            await self.surface(page, "Profile card", ".mm46-profile-card", gradient=True)
            await self.surface(page, "Profile inset statistics", ".mm46-stat-row", gradient=True)
            await self.shot(page, "depth423-profile.png")
            await self.repeated_install(page)
            self.check("Packaged previews have no uncaught script errors", not errors, errors)
            self.check("Packaged previews attempt no API writes", not router.writes, router.writes)
            self.check("All packaged API reads use explicit fixtures", not router.unknown, router.unknown)
        finally:
            self.report["packaged"] = {"pageErrors": errors, "writesDenied": router.writes,
                "unknownRequests": router.unknown, "servedAssets": sorted(router.served),
                "deniedExternal": router.denied_external,
                "scope": "Original APK resource bytes; synthetic local API contracts; no live forwarding"}
            router.closed = True
            await context.close()


async def run(args):
    output = Path(args.out)
    output.mkdir(exist_ok=True, parents=True)
    helper = load_fixture_helpers()
    assets = helper.Assets(SimpleNamespace(apk=args.apk, assets=args.assets,
        baseline_probe=False, expected_apk_sha256=args.expected_apk_sha256))
    report = {"suite": "Marney 4.23 focused material preview", "assetIdentity": assets.identity,
              "checks": [], "surfaces": {}, "screenshots": [], "completed": False,
              "limitations": ["Chrome mobile viewport; native navigation checked separately",
                              "Synthetic Social/Profile/Group/News data, no real account or message access",
                              "No native GPU, device frame-rate, video-decoding or backend performance claim"]}
    browser = None
    start = time.monotonic()
    try:
        for name in ("depth423.css", "depth423.js"):
            report[name + "Sha256"] = hashlib.sha256(assets.files[name]).hexdigest()
        preview = Preview(assets, helper, output, report, home_script(args.apk))
        css = re.sub(r"/\*.*?\*/", "", preview.css, flags=re.S)
        js = re.sub(r"//[^\n]*", "", preview.script)
        preview.check("Depth patch adds no animation, transforms or network assets",
                      not re.search(r"@keyframes|@import|url\s*\(|(?:^|[;{])\s*(?:transform|animation|transition|filter|backdrop-filter)\s*:", css, re.I))
        preview.check("Depth installer adds no polling, observers or requests",
                      not re.search(r"\b(?:setTimeout|setInterval|requestAnimationFrame|MutationObserver|ResizeObserver|fetch|XMLHttpRequest)\b", js))
        chrome = args.chrome or next((shutil.which(n) for n in
            ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser") if shutil.which(n)), None)
        if not chrome:
            raise RuntimeError("No system Chrome/Chromium executable; use the configured CI runner")
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(executable_path=chrome, headless=True,
                args=["--disable-dev-shm-usage", "--disable-background-networking"])
            await preview.public_home(browser)
            await preview.packaged(browser)
            report["completed"] = True
            await browser.close()
            browser = None
    except Exception as error:
        report["error"] = type(error).__name__ + ": " + str(error)[:1600]
    finally:
        if browser:
            try:
                await asyncio.wait_for(browser.close(), timeout=5)
            except Exception:
                pass
        report["elapsedSeconds"] = round(time.monotonic() - start, 1)
        report["passed"] = sum(x["passed"] for x in report["checks"])
        report["failed"] = sum(not x["passed"] for x in report["checks"])
        report["success"] = report["completed"] and report["failed"] == 0 and not report.get("error")
        (output / "depth423-visual.json").write_text(json.dumps(report, indent=2, ensure_ascii=False))
        print(json.dumps({k: report.get(k) for k in
            ("success", "completed", "passed", "failed", "elapsedSeconds", "screenshots", "error")}, ensure_ascii=False))
    return 0 if report["success"] else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apk", default="deliver/Marney423.apk")
    parser.add_argument("--assets", help="Source-assets development alternative; disables --apk")
    parser.add_argument("--expected-apk-sha256")
    parser.add_argument("--out", default="quality423")
    parser.add_argument("--chrome")
    args = parser.parse_args()
    if args.assets:
        args.apk = None
    sys.exit(asyncio.run(asyncio.wait_for(run(args), timeout=220)))
