#!/usr/bin/env python3
"""Verify Marney 4.38 UI preservation plus Social timeline and TV fixes."""
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


allowed_changes = {
    "app/src/main/java/com/marketmarney/mobile/MainActivity.java",
    "app/src/main/assets/social44.js",
    "app/src/main/assets/social411/app.js",
    "app/src/main/assets/social411/bundle427.js",
}
for rel, digest in manifest["preserved"].items():
    if rel not in allowed_changes:
        assert sha(root / rel) == digest, rel
for entry in manifest["changed"]:
    rel = entry["path"]
    if rel not in allowed_changes:
        assert sha(root / rel) == entry["afterSha256"], rel

main = (root / "app/src/main/java/com/marketmarney/mobile/MainActivity.java").read_text(encoding="utf-8")
build = (root / "app/build.gradle").read_text(encoding="utf-8")
install_build = (install_root / "app/build.gradle").read_text(encoding="utf-8")
assets = root / "app/src/main/assets"

required = [
    'labels={"Beranda","Berita","MarketMarney TV","Market Live","Social Marney"}',
    'paths={"/index.html",NEWS_PATH,"/index.html#mm-app-tv","/index.html#marketlive","/beranda-trader.html#mm44-feed"}',
    '"MarketMarney\\nTV":labels[i]',
    'c.drawRoundRect(2,4,22,19,3,3,p)',
    'if("mm-app-tv".equals(h)&&tab!=XAUWAR)',
    'window.__mmAppTvRoute',
    'button[name=\\"MARKETMARNEY TV\\"]',
    "scope.querySelectorAll('button,a,[role=\\\"button\\\"]')",
    "text.indexOf('marketmarney tv')>=0",
    "document.documentElement.dataset.mmAppTv=mark",
    "new CustomEvent('mmapp:tv-'+mark)",
    'Log.i("MMAPP_TV","resilient route injected tab=2 catalogue=MarketMarney TV")',
    '/akun.html?next=%2Fberanda-trader.html%23mm44-feed',
    'open(BASE+paths[SOCIAL])',
    'asset("fluid438.css")',
    'setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT,lowRamDevice)',
    'int retainLimit=lowRamDevice||nativePowerSave?1:2',
    'MM438_NAV',
    'MM438_ASSETS',
]
for marker in required:
    assert marker in main, f"Missing required marker: {marker}"
assert 'labels={"Beranda","Berita","XAUWar","Market Live","Social Marney"}' not in main
assert 'paths={"/index.html",NEWS_PATH,XAUWAR_PATH' not in main
assert 'if(tab!=XAUWAR){navigate(XAUWAR);if(!(BASE+XAUWAR_PATH)' not in main
assert 'Log.i("MMAPP_TV","route injected tab=2 catalogue=MarketMarney TV")' not in main

account_target = "/akun.html?next=%2Fberanda-trader.html%23mm44-feed"
google_target = "/api/auth/google/start?next=%2Fberanda-trader.html%23mm44-feed"
for rel in ("social44.js", "social411/app.js", "social411/bundle427.js"):
    script = (assets / rel).read_text(encoding="utf-8")
    assert f"function login(){{location.href='{account_target}';}}" in script, rel
    assert f"email.href='{account_target}'" in script, rel
    assert f"g.href='{google_target}'" in script, rel
    assert "function login(){location.href='/akun.html';}" not in script, rel

assert "applicationId 'com.marketmarney.mobile.beta438'" in build
assert "versionCode 42" in build
assert "versionName '4.38.0-beta'" in build
assert "applicationId 'com.marketmarney.mobile.beta438tv2'" in install_build
assert "versionCode 44" in install_build
assert "versionName '4.38.2-social-tv'" in install_build

expected_assets = {
    "assets/" + p.relative_to(assets).as_posix(): p
    for p in assets.rglob("*") if p.is_file()
}

base_apk = deliver / "Marney438-SocialTV-TestBase.apk"
install_apk = deliver / "Marney438-SocialTimeline-MarketMarneyTV.apk"
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
        dex = b"".join(archive.read(name) for name in archive.namelist() if name.endswith(".dex"))
        assert b"MarketMarneyAndroid/4.38 AppShell" in dex
        assert b"MarketMarney TV" in dex
        assert b"MMAPP_TV" in dex
        assert b"MM438_LAUNCH" in dex

apk_digest = sha(install_apk)
(deliver / "Marney438-SocialTimeline-MarketMarneyTV.sha256").write_text(
    apk_digest + "  Marney438-SocialTimeline-MarketMarneyTV.apk\n", encoding="utf-8"
)
quality = Path("quality438socialtv")
quality.mkdir(exist_ok=True)
(quality / "static-report.json").write_text(json.dumps({
    "success": True,
    "base": "Marney 4.38 Fluid",
    "requestedChanges": [
        "Social login returns to /beranda-trader.html#mm44-feed",
        "MarketMarney TV route uses resilient live-DOM selectors",
    ],
    "installPackage": "com.marketmarney.mobile.beta438tv2",
    "version": "4.38.2-social-tv",
    "apkSha256": apk_digest,
    "assetCount": len(expected_assets),
    "preservedFiles": len(manifest["preserved"]),
    "allowedChangedFiles": sorted(allowed_changes),
}, indent=2) + "\n", encoding="utf-8")
print("PASS: Marney 4.38 preserved; Social timeline return and TV route verified")
print("APK SHA-256:", apk_digest)
