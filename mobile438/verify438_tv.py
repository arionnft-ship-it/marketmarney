#!/usr/bin/env python3
"""Verify Marney 4.38 UI preservation, Social timeline, and local TV shell."""
from pathlib import Path
from zipfile import ZipFile
import hashlib
import json
import sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else "android438")
install_root = Path(sys.argv[2] if len(sys.argv) > 2 else "android438-install")
deliver = Path(sys.argv[3] if len(sys.argv) > 3 else "deliver")
manifest = json.loads(Path("verified438.json").read_text(encoding="utf-8"))


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


for rel, digest in manifest["preserved"].items():
    assert sha(root / rel) == digest, rel
for entry in manifest["changed"]:
    rel = entry["path"]
    if rel.endswith("MainActivity.java"):
        continue
    assert sha(root / rel) == entry["afterSha256"], rel

main = (root / "app/src/main/java/com/marketmarney/mobile/MainActivity.java").read_text(encoding="utf-8")
build = (root / "app/build.gradle").read_text(encoding="utf-8")
install_build = (install_root / "app/build.gradle").read_text(encoding="utf-8")
assets = root / "app/src/main/assets"
tv_html = assets / "marketmarney-tv.html"
tv_snapshot = assets / "marketmarney-tv-catalogue.json"

required = [
    'labels={"Beranda","Berita","MarketMarney TV","Market Live","Social Marney"}',
    'paths={"/index.html",NEWS_PATH,"/__android43/marketmarney-tv","/index.html#marketlive","/beranda-trader.html#mm44-feed"}',
    '"MarketMarney\\nTV":labels[i]',
    'c.drawRoundRect(2,4,22,19,3,3,p)',
    'if("mm-app-tv".equals(h)&&tab!=XAUWAR)',
    '"/__android43/marketmarney-tv".equals(u.getPath())',
    'getAssets().open("marketmarney-tv.html")',
    'requestNativeTvCatalogue(WebView target,String url,int epoch)',
    'liveTvCatalogue()',
    'getAssets().open("marketmarney-tv-catalogue.json")',
    'window.MMNativeTvReceive',
    "document.getElementById('mm-tv-root')",
    "grid.querySelectorAll('.card')",
    'Log.i("MMAPP_TV","ready catalogue="+value)',
    'Log.i("MMAPP_TV_NET","catalogue delivered source="+safeSource)',
    'cancelTvRoute();navigationStarted=SystemClock.uptimeMillis()',
    'if(tab==XAUWAR){firstPaint=false;resumePage(web);progress.setVisibility(View.VISIBLE);pageReady(web,web.getUrl());}',
    "var key='mmapp:social-login-pending'",
    "document.getElementById('authForm')",
    "sessionStorage.setItem(key,'1')",
    "fetch('/api/community/status'",
    "location.replace('/beranda-trader.html#mm44-feed')",
    'expected.getQueryParameter("pengaturan")==null',
    'asset("fluid438.css")',
    'setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT,lowRamDevice)',
    'int retainLimit=lowRamDevice||nativePowerSave?1:2',
    'MM438_NAV',
    'MM438_ASSETS',
]
for marker in required:
    assert marker in main, f"Missing required marker: {marker}"

for forbidden in [
    'labels={"Beranda","Berita","XAUWar","Market Live","Social Marney"}',
    'paths={"/index.html",NEWS_PATH,XAUWAR_PATH',
    'paths={"/index.html",NEWS_PATH,"/index.html#mm-app-tv"',
    'if(tab!=XAUWAR){navigate(XAUWAR);if(!(BASE+XAUWAR_PATH)',
    "app.querySelector('.mm-tv-grid')",
    "app.querySelector('.mm-tv-filters')",
]:
    assert forbidden not in main, f"Obsolete marker remains: {forbidden}"

assert tv_html.is_file() and tv_html.stat().st_size > 5_000
html = tv_html.read_text(encoding="utf-8")
for marker in [
    'id="mm-tv-root"', 'id="grid"', 'window.MMNativeTvReceive',
    "fetch('/api/content'", "root.dataset.mmTvStatus='ready'",
    'video.controls=true', 'www.youtube-nocookie.com/embed/',
]:
    assert marker in html, marker

assert tv_snapshot.is_file() and tv_snapshot.stat().st_size > 200
snapshot = json.loads(tv_snapshot.read_text(encoding="utf-8"))
assert snapshot.get('source') == 'public-catalogue-snapshot'
videos = snapshot.get('videos')
assert isinstance(videos, list) and videos
assert all(v.get('status') == 'published' and v.get('url') and v.get('title') for v in videos)

assert "applicationId 'com.marketmarney.mobile.beta438'" in build
assert "versionCode 42" in build
assert "versionName '4.38.0-beta'" in build
assert "applicationId 'com.marketmarney.mobile.beta438tv'" in install_build
assert "versionCode 45" in install_build
assert "versionName '4.38.3-tv'" in install_build

expected_assets = {
    "assets/" + p.relative_to(assets).as_posix(): p
    for p in assets.rglob("*") if p.is_file()
}

base_apk = deliver / "Marney438-Social-TV-TestBase.apk"
install_apk = deliver / "Marney438-Social-TV-Stable.apk"
for apk in (base_apk, install_apk):
    assert apk.is_file() and apk.stat().st_size > 1_000_000, apk
    with ZipFile(apk) as archive:
        assert archive.testzip() is None
        actual = {
            entry.filename for entry in archive.infolist()
            if entry.filename.startswith("assets/") and not entry.is_dir()
        }
        assert actual == set(expected_assets), f"APK asset inventory differs: {apk.name}"
        for name, path in expected_assets.items():
            assert archive.read(name) == path.read_bytes(), (apk.name, name)
        dex = b"".join(archive.read(name) for name in archive.namelist() if name.endswith('.dex'))
        for marker in [
            b"MarketMarneyAndroid/4.38 AppShell", b"MarketMarney TV", b"MMAPP_TV",
            b"MMAPP_TV_NET", b"MM438_LAUNCH", b"mmapp:social-login-pending",
            b"/api/community/status", b"#mm44-feed", b"marketmarney-tv.html",
            b"marketmarney-tv-catalogue.json", b"/__android43/marketmarney-tv",
        ]:
            assert marker in dex, (apk.name, marker)

apk_digest = sha(install_apk)
(deliver / "Marney438-Social-TV-Stable.sha256").write_text(
    apk_digest + "  Marney438-Social-TV-Stable.apk\n", encoding="utf-8"
)
quality = Path("quality438tv")
quality.mkdir(exist_ok=True)
(quality / "static-report.json").write_text(json.dumps({
    "success": True,
    "base": "Marney 4.38 Fluid",
    "requestedChanges": [
        "Social login redirects to Linimasa #mm44-feed",
        "MarketMarney TV uses a lightweight local shell",
        "TV catalogue has live HTTPS and bundled public snapshot fallback",
    ],
    "installPackage": "com.marketmarney.mobile.beta438tv",
    "version": "4.38.3-tv",
    "apkSha256": apk_digest,
    "assetCount": len(expected_assets),
    "snapshotVideos": len(videos),
    "preservedFiles": len(manifest["preserved"]),
}, indent=2) + "\n", encoding="utf-8")
print("PASS: Marney 4.38 preserved; Social timeline and local TV shell verified")
print("Published snapshot videos:", len(videos))
print("APK SHA-256:", apk_digest)
