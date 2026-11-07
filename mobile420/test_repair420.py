"""Behavioral regression for Marney 4.20 using every original social core script.

Run: python3 mobile420/test_repair420.py --apk final420.apk --out quality420-ui
Developer alternative: --assets android420/app/src/main/assets

HTML/JS/CSS are served unchanged from the APK resource map at the real HTTPS
origin. The only init script observes performance; it never changes app state,
authentication, DOM, fetch, timers, or application functions. Fixture responses
are deliberately synthetic and are the only source of authentication/data.
Every request is fulfilled locally or denied; service workers and WebSockets
are blocked. Non-GET/HEAD requests are counted and denied, never forwarded.

Fixture schemas follow consumers in social411/5eab9da17fe2c659.js (status,
profile, feed, stories, follows, connect), 70b6aa93cfd032ab.js (inbox), and
aec2875283c2d28e.js (notification counts). Unknown APIs fail explicitly. These
tests establish client behavior against those contracts, not backend health,
real authentication, uploads, message delivery, or video decoding performance.
"""

import argparse
import asyncio
import collections
import hashlib
import json
import mimetypes
import re
import shutil
import sys
import time
import zipfile
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from playwright.async_api import async_playwright


ORIGIN = "https://marketmarney.com"
SOCIAL = "/beranda-trader.html"
DELIVERED_419_SHA = "c4ea1864de45ebb0f6463c14cf140bbe49f3c397fe56bb274133154fe5708aa2"
CSP = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; connect-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self' https://fonts.gstatic.com; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'self'"
BRAND_ALIASES = (
    "/__android417/brand/logo.png", "/assets/brand-logo.webp",
    "/assets/brand-logo.png", "/favicon.png", "/assets/apple-touch-icon.png",
    "/assets/embedded-favicon.png", "/icons/icon-192.png", "/icons/icon-512.png",
    "/marketmarney-m-logo.png",
)
SESSION_USER = {"username": "qa_fixture", "displayName": "Studio Uji"}
PROFILE = {**SESSION_USER, "bio": "Akun simulasi pengujian antarmuka.", "avatarUrl": None}
FIXTURE_TIME = 1794052800000
CHART = b'<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="800" height="450" fill="#142a3d"/><path d="M0 340L120 300L220 325L330 220L440 250L550 150L650 175L800 80" fill="none" stroke="#edc27a" stroke-width="6"/><text x="46" y="78" font-family="sans-serif" font-size="24" fill="#edc27a">STUDIO UJI / SIMULASI QA</text><text x="46" y="118" font-family="sans-serif" font-size="17" fill="#adbdd1">Bukan harga atau analisis pasar aktual</text></svg>'


def post(number, body, image=False):
    return {
        "id": f"qa-post-{number}", **SESSION_USER, "body": body,
        "createdAt": FIXTURE_TIME - number * 60000, "avatarUrl": None,
        "imageUrl": "/qa-fixture/chart.svg" if image else None,
        "videoUrl": None, "comments": 0,
        "reactions": {"total": 0, "items": [], "mine": None},
    }


POSTS = [
    post(1, "Chart latihan untuk pengujian antarmuka, bukan saran transaksi.", True),
    post(2, "Jurnal latihan: semua isi di halaman ini adalah data simulasi QA."),
    post(3, "Materi latihan tambahan untuk memeriksa tombol muat berikutnya."),
]
REEL = {"id": "qa-reel-stats", **SESSION_USER, "avatarUrl": None,
        "createdAt": FIXTURE_TIME, "caption": "Reel simulasi QA: statistik ditunda, video tidak diputar.",
        "videoUrl": "/qa-fixture/reel.mp4", "own": False}
REEL_STATS = {"liked": False, "likes": 7, "comments": 3, "views": 21,
              "commentsEnabled": True}


def digest(data):
    return hashlib.sha256(data).hexdigest()


class ScriptSources(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() == "script":
            src = dict(attrs).get("src")
            if src:
                self.paths.append(urlsplit(src).path)


class Assets:
    def __init__(self, args):
        if args.apk:
            raw = Path(args.apk).read_bytes()
            self.identity = {"input": "APK", "sha256": digest(raw), "bytes": len(raw)}
            if args.baseline_probe and self.identity["sha256"] != DELIVERED_419_SHA:
                raise ValueError("Baseline probes require the exact delivered 4.19 APK")
            if args.expected_apk_sha256 and self.identity["sha256"] != args.expected_apk_sha256.lower():
                raise ValueError("APK SHA-256 does not match the requested artifact")
            with zipfile.ZipFile(args.apk) as z:
                self.files = {n[7:]: z.read(n) for n in z.namelist()
                              if n.startswith("assets/") and not n.endswith("/")}
        else:
            root = Path(args.assets).resolve()
            self.files = {str(p.relative_to(root)): p.read_bytes()
                          for p in root.rglob("*") if p.is_file()}
            self.identity = {"input": "source assets", "path": str(root)}
        self.mapping = json.loads(self.files["resources49-map.json"])
        for route, asset in self.mapping.items():
            if not route.startswith("/") or ".." in route or ".." in asset or asset not in self.files:
                raise ValueError("Invalid resource map entry")
        self.mapping.update({p: "brand417/logo.png" for p in BRAND_ALIASES})
        self.social = self.files[self.mapping[SOCIAL]]
        parser = ScriptSources()
        parser.feed(self.social.decode("utf-8"))
        self.script_paths = parser.paths
        if not self.script_paths or any(p not in self.mapping for p in self.script_paths):
            raise ValueError("Every original social script must be supplied by the resource map")
        self.identity["socialHtmlSha256"] = digest(self.social)
        self.identity["originalScriptCount"] = len(self.script_paths)
        self.identity["originalScripts"] = {
            p: digest(self.files[self.mapping[p]]) for p in self.script_paths
        }


# Observation only: no application APIs, timers, DOM nodes, or globals are faked.
OBSERVE = r"""(() => {
  const d = window.__repair420Metrics = {mutations:0, noOpAttributes:0,
    maxRepeat:0, longTasks:[], frames:0, lastFrame:0, maxFrameGap:0,
    perTarget:new WeakMap(), started:performance.now()};
  try { new PerformanceObserver(list => {
    for (const e of list.getEntries()) if (d.longTasks.length < 300)
      d.longTasks.push({start:e.startTime, duration:e.duration});
  }).observe({type:'longtask', buffered:true}); } catch (_) {}
  const observe = () => new MutationObserver(records => {
    d.mutations += records.length;
    for (const r of records) {
      if (r.type === 'attributes' && r.oldValue === r.target.getAttribute(r.attributeName))
        d.noOpAttributes++;
      const n = (d.perTarget.get(r.target) || 0) + 1;
      d.perTarget.set(r.target, n); d.maxRepeat = Math.max(d.maxRepeat, n);
    }
  }).observe(document.documentElement, {subtree:true,childList:true,
    attributes:true,attributeOldValue:true,characterData:true});
  if (document.documentElement) observe();
  else document.addEventListener('DOMContentLoaded', observe, {once:true});
  const frame = t => {d.frames++; if (d.lastFrame) d.maxFrameGap=Math.max(d.maxFrameGap,t-d.lastFrame);
    d.lastFrame=t; requestAnimationFrame(frame);}; requestAnimationFrame(frame);
})();"""

METRICS = r"""() => {
 const d=window.__repair420Metrics, now=performance.now();
 return {now, mutations:d.mutations, noOpAttributes:d.noOpAttributes,
   maxRepeat:d.maxRepeat, frames:d.frames, maxFrameGapMs:d.maxFrameGap,
   longTasks:d.longTasks.slice(), overflowPx:Math.max(0,document.documentElement.scrollWidth-innerWidth),
   auth:document.documentElement.dataset.mmAuthState||null,
   view:document.documentElement.dataset.mm44View||null};
}"""


class FixtureRouter:
    """All network requests end here; this class has no forwarding operation."""

    def __init__(self, assets, scenario):
        self.assets, self.scenario = assets, scenario
        self.calls = collections.Counter()
        self.served = set()
        self.requests = []
        self.writes = []
        self.unknown = []
        self.denied_external = []
        self.failed = []
        self.aborted_requests = set()
        self.closed = False
        self.hold_status = asyncio.Event()
        self.hold_neighbors = asyncio.Event()
        self.hold_stats = asyncio.Event()
        self.hold_media = asyncio.Event()
        self.stats_started = asyncio.Event()
        self.login_attempted = asyncio.Event()
        self.status_started = None
        self.neighbors_started = set()

    def count(self, path):
        return self.calls[path]

    def on_failed(self, request):
        self.aborted_requests.add(request)
        self.failed.append({"path": urlsplit(request.url).path, "error": request.failure})

    async def json_response(self, route, body, status=200):
        await route.fulfill(status=status, content_type="application/json",
                            headers={"cache-control": "no-store"}, body=json.dumps(body))

    async def stall(self, route, gate):
        try:
            await asyncio.wait_for(gate.wait(), timeout=25)
        except asyncio.TimeoutError:
            pass
        return not self.closed and route.request not in self.aborted_requests

    async def websocket(self, socket):
        self.denied_external.append({"kind": "websocket", "path": urlsplit(socket.url).path})
        await socket.close()

    async def handle(self, route):
        request = route.request
        u = urlsplit(request.url)
        path = u.path
        self.calls[path] += 1
        ordinal = self.calls[path]
        if path == "/akun.html":
            self.login_attempted.set()
        self.requests.append({"method": request.method, "path": path,
                              "type": request.resource_type, "ordinal": ordinal})
        if request.method not in ("GET", "HEAD"):
            self.writes.append({"method": request.method, "path": path})
            await self.json_response(route, {"error": "QA blocks all writes"}, 405)
            return
        if u.scheme != "https" or u.hostname != "marketmarney.com" or u.port not in (None, 443):
            self.denied_external.append({"kind": request.resource_type, "path": path})
            await route.abort("blockedbyclient")
            return
        if path in self.assets.mapping:
            filename = self.assets.mapping[path]
            body = self.assets.files[filename]
            mime = "text/javascript" if filename.endswith(".js") else mimetypes.guess_type(filename)[0] or "application/octet-stream"
            headers = {"content-type": mime, "cache-control": "no-store",
                       "x-content-type-options": "nosniff", "x-marney-asset": "49"}
            if filename.endswith(".html"):
                headers["content-security-policy"] = CSP
            self.served.add(path)
            await route.fulfill(status=200, headers=headers, body=body)
            return
        if path == "/qa-fixture/chart.svg":
            await route.fulfill(content_type="image/svg+xml", body=CHART)
            return
        if self.scenario == "reel_stats_pending" and path == "/assets/video-placeholder1880.svg":
            await route.fulfill(content_type="image/svg+xml", body=CHART)
            return
        if self.scenario == "reel_stats_pending" and path == "/qa-fixture/reel.mp4":
            # No media bytes are delivered: this is a UI/statistics ordering test,
            # never a simulated playback, watched view, or production video request.
            if await self.stall(route, self.hold_media):
                await route.fulfill(status=204, content_type="video/mp4", body=b"")
            return
        if self.scenario == "reel_stats_pending" and path == "/api/social-video/summaries":
            query = parse_qs(u.query)
            if query == {"kind": ["reel"], "ids": [REEL["id"]]}:
                self.stats_started.set()
                if await self.stall(route, self.hold_stats):
                    await self.json_response(route, {"items": {REEL["id"]: REEL_STATS}})
                return
        if path == "/api/community/status":
            self.status_started = self.status_started or time.monotonic()
            if self.scenario == "guest_401":
                await self.json_response(route, {"error": "Fixture session absent"}, 401)
                return
            if self.scenario == "session_500" and ordinal == 1:
                await self.json_response(route, {"error": "Fixture service unavailable"}, 500)
                return
            if self.scenario in ("session_timeout", "baseline_loading_navigation") and ordinal == 1:
                if not await self.stall(route, self.hold_status):
                    return
                # A test that only passes after this response has no client deadline.
                await self.json_response(route, {"error": "Fixture stalled request released"}, 504)
                return
            await self.json_response(route, {"user": SESSION_USER})
            return
        if path.startswith("/api/") and self.scenario == "guest_401" and path != "/api/content":
            await self.json_response(route, {"error": "Fixture session absent"}, 401)
            return
        if path == "/api/trader-profiles/me":
            if self.scenario in ("profile_500", "baseline_profile_500") and ordinal == 1:
                await self.json_response(route, {"error": "Profil sementara tidak tersedia."}, 500)
            elif self.scenario == "profile_malformed" and ordinal == 1:
                await self.json_response(route, {"profile": None})
            else:
                await self.json_response(route, {"profile": PROFILE})
            return
        if path in ("/api/trader-connect/conversations", "/api/trader-connect/groups"):
            if self.scenario == "profile_500" and not self.hold_neighbors.is_set():
                self.neighbors_started.add(path)
                if not await self.stall(route, self.hold_neighbors):
                    return
        simple = {
            "/api/community/me": {"user": SESSION_USER},
            "/api/trader-profiles/stories": {"items": []},
            "/api/trader-follow/me": {"followerCount": 0, "followingCount": 0,
                                      "followers": [], "following": [], "theme": "light"},
            "/api/trader-follow/search": {"items": [], "hint": "Akun simulasi QA."},
            "/api/trader-connect/conversations": {"items": [], "unread": 0},
            "/api/trader-connect/groups": {"mine": [], "discover": []},
            "/api/trader-connect/reels": {"items": [REEL] if self.scenario == "reel_stats_pending" else []},
            "/api/trader-connect/unread": {"unread": 0},
            "/api/trader-connect/search": {"users": [], "groups": [], "posts": []},
            "/api/trader-notifications": {"items": [], "unread": 0},
            "/api/trader-notifications/count": {"unread": 0},
            "/api/content": {"articles": []},
        }
        if path in simple:
            await self.json_response(route, simple[path])
            return
        if path == "/api/trader-profiles/feed":
            offset = int(parse_qs(u.query).get("offset", ["0"])[0])
            await self.json_response(route, {"items": POSTS[:2] if offset == 0 else POSTS[2:],
                                             "hasMore": offset == 0})
            return
        if path == "/akun.html" and self.scenario == "baseline_loading_navigation":
            # Observe the real redirect without inventing an account page or contacting production.
            await route.abort("blockedbyclient")
            return
        # A missing fixture must be visible, never silently substituted by {} or live data.
        self.unknown.append({"method": request.method, "path": path, "type": request.resource_type})
        await self.json_response(route, {"error": "No local QA fixture for this request"}, 404)


class Case:
    def __init__(self, page, router, output, width, scenario):
        self.page, self.router, self.output = page, router, output
        self.width, self.scenario = width, scenario
        self.checks, self.metrics = [], []
        self.errors, self.console = [], []
        self.screenshots = []
        self.observations = {}
        page.on("pageerror", lambda error: self.errors.append(str(error)[:1000]))
        page.on("console", lambda msg: self.console.append({"type": msg.type, "text": msg.text[:800]})
                if msg.type in ("error", "warning") and len(self.console) < 50 else None)
        page.on("requestfailed", router.on_failed)

    def check(self, name, ok, detail=None):
        record = {"name": name, "passed": bool(ok)}
        if detail is not None:
            record["detail"] = detail
        self.checks.append(record)
        if not ok:
            raise AssertionError(name + (": " + str(detail) if detail is not None else ""))

    async def wait(self, expression, timeout=6000):
        # Playwright's wait_for_function evaluates its polling predicate inside the
        # page, which is rejected by the APK's no-unsafe-eval CSP. Evaluate a
        # function through the browser protocol instead; keep the production CSP.
        deadline = time.monotonic() + timeout / 1000
        while time.monotonic() < deadline:
            remaining = deadline - time.monotonic()
            result = await asyncio.wait_for(
                self.page.evaluate("() => Boolean(" + expression + ")"),
                timeout=max(0.05, min(1.5, remaining)))
            if result:
                return
            await self.page.wait_for_timeout(min(100, max(1, remaining * 1000)))
        raise TimeoutError(f"Condition not met within {timeout} ms: {expression}")

    async def open(self):
        response = await self.page.goto(ORIGIN + SOCIAL, wait_until="domcontentloaded", timeout=8000)
        self.check("Original HTML document loaded", response is not None and response.status == 200)
        await self.page.locator("#mm44-social-header .mm44-nav-button").first.wait_for(state="visible", timeout=6000)
        scripts = await self.page.locator("script[src]").evaluate_all("nodes => nodes.map(n=>new URL(n.src).pathname)")
        self.check("Every original core script retained in the document",
                   scripts == self.router.assets.script_paths,
                   {"expected": len(self.router.assets.script_paths), "actual": len(scripts)})
        self.check("Every original core script served from exact asset bytes",
                   set(self.router.assets.script_paths).issubset(self.router.served))

    async def authenticated(self):
        await self.wait("document.documentElement.dataset.mmAuthState==='authenticated' && !document.getElementById('shLogged').hidden")
        await self.wait("document.querySelectorAll('#shFeed .sh-post').length===2")
        layout = await self.page.evaluate("""() => {
          const h=document.documentElement, logged=document.getElementById('shLogged');
          const pane=document.getElementById(h.dataset.mm44View==='reels'?'shReelsPanel':'shFeed');
          return {auth:h.dataset.mmAuthState, view:h.dataset.mm44View,
            loggedHidden:logged.hidden, loggedHeight:logged.getBoundingClientRect().height,
            activePaneHeight:pane.getBoundingClientRect().height};
        }""")
        self.observations["authenticatedLayout"] = layout
        self.check("Authenticated session remains enabled", layout["auth"] == "authenticated" and not layout["loggedHidden"], layout)
        # Reels is position:fixed and its siblings are display:none, so the
        # authenticated wrapper can correctly have height zero. Test the actual
        # active pane; feed mode must still expose its normal-flow feed container.
        if layout["view"] == "reels":
            await self.page.locator("#shReelsPanel").wait_for(state="visible", timeout=2500)
            self.check("Authenticated Reels pane remains visible", await self.page.locator("#shReelFeed").is_visible())
        else:
            self.check("Authenticated feed remains visible", layout["view"] == "feed" and await self.page.locator("#shLogged").is_visible() and await self.page.locator("#shFeed").is_visible())
        self.check("Guest login panel stays hidden", await self.page.locator("#shGuest").is_hidden())
        self.check("Feed is rendered by the real client", self.router.count("/api/trader-profiles/feed") == 1)

    async def nav(self, name, view):
        await self.page.locator(f'#mm44-social-header .mm44-nav-button[aria-label="{name}"]').click(timeout=2500)
        await self.wait(f"document.documentElement.dataset.mm44View==={json.dumps(view)}", timeout=2500)
        self.check(f"{name} navigation changes the active view", urlsplit(self.page.url).path == SOCIAL)

    async def screenshot(self, label):
        filename = f"{self.scenario}-{self.width}-{label}.png"
        await self.page.screenshot(path=str(self.output / filename), timeout=4000)
        self.screenshots.append(filename)

    async def stable(self, label):
        # Broad responsiveness gates, not a device benchmark. Idle clocks may mutate
        # the page; repeated observer writes and long uninterrupted work may not.
        await self.page.wait_for_timeout(450)
        before = await asyncio.wait_for(self.page.evaluate(METRICS), timeout=3)
        await self.page.wait_for_timeout(1400)
        after = await asyncio.wait_for(self.page.evaluate(METRICS), timeout=3)
        tasks = [x["duration"] for x in after["longTasks"] if x["start"] >= before["now"]]
        sample = {"label": label, "windowMs": round(after["now"] - before["now"]),
                  "mutations": after["mutations"] - before["mutations"],
                  "noOpAttributes": after["noOpAttributes"] - before["noOpAttributes"],
                  "frames": after["frames"] - before["frames"],
                  "longTaskMs": round(sum(tasks), 1), "maxLongTaskMs": round(max(tasks, default=0), 1),
                  "overflowPx": after["overflowPx"]}
        self.metrics.append(sample)
        self.check(label + " has bounded idle DOM activity", sample["mutations"] <= 250 and sample["noOpAttributes"] <= 40, sample)
        self.check(label + " event loop remains responsive", sample["frames"] >= 3 and sample["maxLongTaskMs"] < 1000 and sample["longTaskMs"] < 1000, sample)
        self.check(label + " fits the mobile viewport", sample["overflowPx"] <= 1, sample["overflowPx"])

    async def invariants(self):
        self.check("No write requests attempted", not self.router.writes, self.router.writes)
        self.check("No missing same-origin fixtures or resources", not self.router.unknown, self.router.unknown)
        self.check("No uncaught JavaScript errors", not self.errors, self.errors)


async def healthy(case):
    p, r = case.page, case.router
    await case.open()
    await case.authenticated()
    await case.stable("Authenticated feed")
    await case.screenshot("feed")
    first_post = await p.locator('#shFeed [data-post-id="qa-post-1"]').element_handle()
    await p.locator("#shMore").click(timeout=3000)
    await case.wait("document.querySelectorAll('#shFeed .sh-post').length===3")
    case.check("Pagination retains the existing post node", await first_post.evaluate("n=>n.isConnected && n===document.querySelector('#shFeed [data-post-id=\"qa-post-1\"]')"))
    case.check("Pagination reads one subsequent page", r.count("/api/trader-profiles/feed") == 2)
    await case.nav("Reels", "reels")
    await case.wait("document.querySelector('#shReelFeed .sh-friend-empty')!==null")
    case.check("Real Reels loader completes", r.count("/api/trader-connect/reels") >= 1)
    await case.nav("Pesan", "messages")
    await p.locator("#shMessengerPane").wait_for(state="visible", timeout=3000)
    case.check("Original Messenger opens without replacement handlers", await p.locator("#shMsgConversationList .sh-msg-empty").count() == 1)
    await p.locator("#shMsgClose").click(timeout=2500)
    await case.nav("Jelajah", "explore")
    await p.locator("#shSearch").fill("Chart")
    await case.wait("document.querySelectorAll('#shFeed .sh-post').length===1")
    await case.wait("document.getElementById('shSearchResults').hidden===false")
    case.check("Real debounced search reads the fixture API", r.count("/api/trader-connect/search") == 1)
    await p.locator("#shSearch").press("Escape")
    await case.nav("Linimasa", "feed")
    await case.wait("document.querySelectorAll('#shFeed .sh-post').length===3")
    await p.locator('#mm44-social-header button[aria-label="Menu Social Marney"]').click(timeout=2500)
    await p.locator("#mm44-create-menu").wait_for(state="visible", timeout=2500)
    case.check("Journal remains available in the social menu", await p.locator("#mm44-create-menu [data-mm420-journal]").is_visible())
    original_form = await p.locator("#shFriendSearch").element_handle()
    await p.locator("#mm44-create-menu [data-mm420-account]").click(timeout=2500)
    await p.locator("#shMobileAccountDialog").wait_for(state="visible", timeout=2500)
    case.check("Drawer keeps the existing interactive form", await original_form.evaluate("n=>n===document.getElementById('shFriendSearch') && !!n.closest('#shMobileAccountDialog')"))
    # The original mobile drawer intentionally starts its panels collapsed.
    if await p.locator("#shFriendToggle").get_attribute("aria-expanded") == "false":
        await p.locator("#shFriendToggle").click(timeout=2500)
    await p.locator("#shFriendQuery").wait_for(state="visible", timeout=2500)
    await case.screenshot("drawer")
    await p.locator("#shFriendQuery").fill("qa")
    await p.locator("#shFriendQuery").press("Enter")
    await case.wait("document.getElementById('shFriendMessage').textContent.includes('simulasi')")
    case.check("Original drawer search listener still issues a GET", r.count("/api/trader-follow/search") == 1)
    await p.locator("#shMobileAccountClose").click(timeout=2500)
    await case.stable("After navigation and drawer interaction")
    await p.locator('#mm44-social-header button[aria-label="Menu Social Marney"]').click(timeout=2500)
    await p.get_by_role("button", name="Grup publik & privat", exact=True).click(timeout=2500)
    await p.wait_for_url("**/grup-trader.html", timeout=5000)
    await case.wait("document.getElementById('gmApp') && !document.getElementById('gmApp').hidden")
    case.check("Menu click navigates to the real bundled group page", "/grup-trader.html" in r.served)
    await case.screenshot("group")


async def profile_failure(case):
    p, r = case.page, case.router
    await case.open()
    await case.authenticated()
    await p.locator("#shProfileRetry").wait_for(state="visible", timeout=2500)
    case.check("Profile failure gives an enabled retry", await p.locator("#shProfileRetry").is_enabled())
    href = await p.locator("#shPublicProfile").get_attribute("href")
    case.check("Fallback public profile preserves session identity", parse_qs(urlsplit(href or "").query).get("user") == [SESSION_USER["username"]])
    await case.screenshot("degraded-profile")
    if case.scenario == "profile_500":
        await case.nav("Reels", "reels")
        await case.wait("document.querySelector('#shReelFeed .sh-friend-empty')!==null", timeout=3500)
        case.check("Reels resolves while DM and groups are still pending",
                   r.count("/api/trader-connect/reels") > 0 and len(r.neighbors_started) == 2 and not r.hold_neighbors.is_set())
        await case.nav("Linimasa", "feed")
    first_post = await p.locator('#shFeed [data-post-id="qa-post-1"]').element_handle()
    feed_before, status_before = r.count("/api/trader-profiles/feed"), r.count("/api/community/status")
    await p.locator("#shProfileRetry").click(timeout=2500)
    await p.locator("#shProfileRetry").wait_for(state="hidden", timeout=3500)
    await case.wait("document.getElementById('shBio').textContent.includes('Akun simulasi')")
    case.check("Profile retry reads only profile data", r.count("/api/trader-profiles/me") == 2 and r.count("/api/trader-profiles/feed") == feed_before and r.count("/api/community/status") == status_before)
    case.check("Profile retry retains the visible feed node", await first_post.evaluate("n=>n.isConnected && n===document.querySelector('#shFeed [data-post-id=\"qa-post-1\"]')"))
    case.check("Successful profile retry keeps authenticated features", await p.locator("#shLogged").is_visible() and await p.locator("#shGuest").is_hidden())
    r.hold_neighbors.set()
    await case.stable("Recovered profile")


async def guest(case):
    p, r = case.page, case.router
    await case.open()
    await case.wait("document.documentElement.dataset.mmAuthState==='guest'")
    case.check("Explicit 401 shows guest sign-in", await p.locator("#shGuest").is_visible())
    case.check("Explicit 401 keeps authenticated features hidden", await p.locator("#shLogged").is_hidden())
    case.check("Guest sign-in points to the account route", await p.locator('#shGuest a[href="/akun.html"]').count() == 1)
    case.check("Guest state does not fetch private feed/profile", r.count("/api/trader-profiles/me") == 0 and r.count("/api/trader-profiles/feed") == 0)
    await case.stable("Explicit guest")
    await case.screenshot("guest")


async def session_failure(case):
    p, r = case.page, case.router
    await case.open()
    if case.scenario == "session_timeout":
        await case.wait("document.documentElement.dataset.mmAuthState==='loading'")
        await p.locator('#mm44-social-header .mm44-nav-button[aria-label="Reels"]').click(timeout=2500)
        case.check("A click during session loading stays on the social page", urlsplit(p.url).path == SOCIAL and r.count("/akun.html") == 0)
        await p.locator("#shSessionRetry").wait_for(state="visible", timeout=16500)
        elapsed = (time.monotonic() - r.status_started) * 1000
        case.check("A stalled GET reaches a bounded client deadline", elapsed < 17000 and not r.hold_status.is_set(), {"elapsedMs": round(elapsed), "fixtureStillPending": not r.hold_status.is_set()})
    else:
        await p.locator("#shSessionRetry").wait_for(state="visible", timeout=3500)
        await p.locator('#mm44-social-header .mm44-nav-button[aria-label="Reels"]').click(timeout=2500)
    case.check("Transient session failure is an error, not guest", await p.get_attribute("html", "data-mm-auth-state") == "error" and await p.locator("#shGuest").is_hidden())
    case.check("Retry is available after a transient read failure", await p.locator("#shSessionRetry").is_enabled())
    case.check("Session failure does not cause login navigation or an automatic retry loop", r.count("/api/community/status") == 1 and r.count("/akun.html") == 0)
    await case.screenshot("retry")
    await p.locator("#shSessionRetry").click(timeout=2500)
    await case.authenticated()
    await case.wait("document.documentElement.dataset.mm44View==='reels'", timeout=3000)
    await case.wait("document.querySelector('#shReelFeed .sh-friend-empty')!==null", timeout=3500)
    case.check("Explicit retry performs one new session GET", r.count("/api/community/status") == 2)
    case.check("Queued navigation is fulfilled after recovery", urlsplit(p.url).path == SOCIAL and r.count("/akun.html") == 0)
    r.hold_status.set()
    await case.stable("Recovered session and queued navigation")


async def reel_stats_pending(case):
    p, r = case.page, case.router
    await case.open()
    await case.authenticated()
    await case.nav("Reels", "reels")
    selector = '#shReelFeed .sh-reel-card[data-reel-id="qa-reel-stats"]'
    card = p.locator(selector)
    await card.wait_for(state="visible", timeout=3000)
    await asyncio.wait_for(r.stats_started.wait(), timeout=2)
    await case.wait("document.querySelector('[data-reel-id=\"qa-reel-stats\"] [data-mm46-action=like]')!==null", timeout=2000)
    case.check("A nonempty Reel renders before optional statistics resolve",
               not r.hold_stats.is_set() and r.count("/api/social-video/summaries") == 1)
    like = card.locator('[data-mm46-action="like"]')
    comments = card.locator('[data-mm46-action="comment"]')
    case.check("Reel actions are usable before statistics arrive",
               await like.is_visible() and await like.is_enabled()
               and await comments.is_visible() and await comments.is_enabled())
    before = await card.evaluate("n=>[n.querySelector('[data-mm46-action=like] strong').textContent,n.querySelector('[data-mm46-action=comment] strong').textContent,n.querySelector('.sh-reel-views strong').textContent]")
    case.check("Missing statistics are not invented as zero", before == ["—", "—", "—"], before)
    original = await card.element_handle()
    case.check("Synthetic video has not played", await card.locator("video").evaluate("v=>v.paused && v.currentTime===0"))
    await case.screenshot("before-statistics")
    r.hold_stats.set()
    await case.wait("(() => {const n=document.querySelector('[data-reel-id=\"qa-reel-stats\"]');return n && n.querySelector('[data-mm46-action=like] strong').textContent==='7' && n.querySelector('[data-mm46-action=comment] strong').textContent==='3' && n.querySelector('.sh-reel-views strong').textContent==='21';})()", timeout=3000)
    case.check("Statistics update the same existing Reel card",
               await original.evaluate("n=>n.isConnected && n===document.querySelector('[data-reel-id=\"qa-reel-stats\"]')"))
    case.check("Statistics use exactly one explicit GET", r.count("/api/social-video/summaries") == 1)
    case.check("No video view registration or other write was simulated", not r.writes, r.writes)
    await case.screenshot("after-statistics")
    await case.stable("Reel after optional statistics")


async def baseline_profile(case):
    """A pass means the delivered client demonstrably has the old profile failure."""
    p, r = case.page, case.router
    await case.open()
    await case.wait("!document.getElementById('shGuest').hidden && document.getElementById('shLogged').hidden")
    observed = {"statusReads": r.count("/api/community/status"),
                "profileReads": r.count("/api/trader-profiles/me"),
                "guestVisible": await p.locator("#shGuest").is_visible(),
                "loggedHidden": await p.locator("#shLogged").is_hidden(),
                "feedReads": r.count("/api/trader-profiles/feed")}
    case.observations["defect"] = observed
    case.check("Reproduced: authenticated profile500 incorrectly becomes guest",
               observed["statusReads"] == 1 and observed["profileReads"] == 1
               and observed["guestVisible"] and observed["loggedHidden"] and observed["feedReads"] == 0,
               observed)
    await case.screenshot("reproduced-profile-defect")
    # Control: exactly the same synthetic account works once the profile response succeeds.
    await p.reload(wait_until="domcontentloaded", timeout=8000)
    await case.wait("!document.getElementById('shLogged').hidden && document.querySelectorAll('#shFeed .sh-post').length===2")
    case.check("Control: same account and core scripts work after profile recovery",
               await p.locator("#shGuest").is_hidden() and r.count("/api/trader-profiles/me") == 2)


async def baseline_loading(case):
    """Observe the unmodified early click navigating to login while status is pending."""
    p, r = case.page, case.router
    await case.open()
    case.check("Baseline session response is genuinely pending",
               r.count("/api/community/status") == 1 and not r.hold_status.is_set())
    await case.screenshot("pending-session")
    try:
        async with p.expect_request(lambda req: urlsplit(req.url).path == "/akun.html", timeout=3500):
            await p.locator('#mm44-social-header .mm44-nav-button[aria-label="Reels"]').click(timeout=2500, no_wait_after=True)
    except Exception:
        if not r.count("/akun.html"):
            raise
    # request events may precede the async route handler; assert after our guard
    # has observed and blocked the attempted navigation, not before it runs.
    await asyncio.wait_for(r.login_attempted.wait(), timeout=2)
    observed = {"accountNavigationAttempts": r.count("/akun.html"),
                "sessionStillPending": not r.hold_status.is_set(),
                "statusReads": r.count("/api/community/status")}
    case.observations["defect"] = observed
    case.check("Reproduced: early Reels click navigates to login before authentication resolves",
               observed["accountNavigationAttempts"] >= 1 and observed["sessionStillPending"], observed)


async def run(args):
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    assets = Assets(args)
    report = {"suite": "Marney420 real-core client regression", "assetIdentity": assets.identity,
              "baselineProbe": args.baseline_probe,
              "successMeaning": "Prior defects reproduced in exact delivered 4.19; not a quality pass" if args.baseline_probe else "Repaired client passes behavioral assertions",
              "startedUtc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
              "scope": "Original HTML and all core scripts; synthetic API contracts only; no production connections",
              "limitations": ["Chromium mobile viewport, not native WebView/GPU performance", "Service workers and WebSockets disabled for complete fixture isolation", "No authentication, account writes, real messages, uploads, or market transactions"],
              "cases": [], "completed": False}

    def save():
        checks = [x for case in report["cases"] for x in case["checks"]]
        report["passed"] = sum(x["passed"] for x in checks)
        report["failed"] = sum(not x["passed"] for x in checks)
        (out / "results.json").write_text(json.dumps(report, indent=2, ensure_ascii=False))

    save()
    chrome = args.chrome or next((shutil.which(name) for name in
        ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser") if shutil.which(name)), None)
    if not chrome:
        raise RuntimeError("No installed Chrome found; set --chrome or install Chromium before running")
    started = time.monotonic()
    scenarios = [("healthy", healthy), ("profile_500", profile_failure),
                 ("profile_malformed", profile_failure), ("guest_401", guest),
                 ("session_500", session_failure), ("session_timeout", session_failure),
                 ("reel_stats_pending", reel_stats_pending)]
    if args.baseline_probe:
        scenarios = [("baseline_profile_500", baseline_profile),
                     ("baseline_loading_navigation", baseline_loading)]
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(executable_path=chrome, headless=True,
            args=["--disable-dev-shm-usage", "--disable-background-networking"])
        try:
            for width in ([412] if args.baseline_probe else args.widths):
                for scenario, test in scenarios:
                    if time.monotonic() - started > 210:
                        report["budgetReached"] = True
                        save()
                        return 1
                    context = await browser.new_context(viewport={"width": width, "height": 820},
                        device_scale_factor=1, is_mobile=True, has_touch=True,
                        reduced_motion="reduce", service_workers="block",
                        user_agent="Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 MarketMarneyAndroid/4.20 AppShell")
                    router = FixtureRouter(assets, scenario)
                    await context.route("**/*", router.handle)
                    await context.route_web_socket("**/*", router.websocket)
                    await context.add_init_script(OBSERVE)
                    page = await context.new_page()
                    page.set_default_timeout(5000)
                    case = Case(page, router, out, width, scenario)
                    case_started = time.monotonic()
                    error = None
                    try:
                        await asyncio.wait_for(test(case), timeout=7.5 if scenario == "reel_stats_pending" else 35)
                        await case.invariants()
                    except Exception as exc:
                        error = {"type": type(exc).__name__, "message": str(exc)[:1800]}
                        if not case.checks or case.checks[-1]["passed"]:
                            case.checks.append({"name": "Scenario completes", "passed": False, "detail": error})
                        try:
                            await asyncio.wait_for(case.screenshot("failure"), timeout=3)
                        except Exception:
                            pass
                    finally:
                        router.closed = True
                        router.hold_status.set()
                        router.hold_neighbors.set()
                        router.hold_stats.set()
                        router.hold_media.set()
                        record = {"name": scenario, "width": width,
                            "durationMs": round((time.monotonic() - case_started) * 1000),
                            "checks": case.checks, "metrics": case.metrics, "error": error,
                            "pageErrors": case.errors, "console": case.console,
                            "requestsByPath": dict(router.calls), "deniedWrites": router.writes,
                            "unknownRequests": router.unknown, "deniedExternal": router.denied_external,
                            "failedRequests": router.failed, "screenshots": case.screenshots,
                            "observations": case.observations}
                        report["cases"].append(record)
                        save()
                        print(json.dumps({"case": scenario, "width": width,
                            "durationMs": record["durationMs"],
                            "passed": sum(x["passed"] for x in case.checks),
                            "failed": sum(not x["passed"] for x in case.checks),
                            "error": error, "writesDenied": len(router.writes),
                            "unknownRequests": len(router.unknown)}), flush=True)
                        try:
                            await asyncio.wait_for(context.close(), timeout=4)
                        except Exception:
                            pass
        finally:
            await asyncio.wait_for(browser.close(), timeout=6)
    report["completed"] = True
    report["elapsedSeconds"] = round(time.monotonic() - started, 1)
    save()
    print(json.dumps({"completed": True, "passed": report["passed"], "failed": report["failed"],
                      "elapsedSeconds": report["elapsedSeconds"]}), flush=True)
    return 1 if report["failed"] else 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--apk", help="Exact built APK whose embedded HTML/JS/CSS will be tested")
    source.add_argument("--assets", help="Developer-only source assets directory")
    parser.add_argument("--expected-apk-sha256", help="Optional exact APK integrity check")
    parser.add_argument("--baseline-probe", action="store_true", help="Reproduce two known defects in the exact delivered 4.19 APK, at width 412")
    parser.add_argument("--out", default="quality420-ui")
    parser.add_argument("--chrome", help="Path to an installed Chrome/Chromium executable")
    parser.add_argument("--widths", type=lambda s: [int(x) for x in s.split(",")], default=[320, 412])
    arguments = parser.parse_args()
    if arguments.baseline_probe and not arguments.apk:
        parser.error("--baseline-probe requires --apk")
    if any(width < 280 or width > 1000 for width in arguments.widths):
        parser.error("Widths must be between 280 and 1000 CSS pixels")
    try:
        sys.exit(asyncio.run(run(arguments)))
    except Exception as exc:
        print(json.dumps({"fatal": type(exc).__name__, "message": str(exc)[:1800]}), file=sys.stderr)
        sys.exit(1)
