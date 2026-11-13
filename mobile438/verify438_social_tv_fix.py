#!/usr/bin/env python3
"""Verify the Social timeline redirect and resilient MarketMarney TV repair."""
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


# Preserve every verified Marney 4.38 file except MainActivity.java, where the
# requested TV route and Social login behavior live.
for rel, digest in manifest["preserved"].items():
    assert sha(root / rel) == digest, rel
for entry in manifest["changed"]:
    rel = entry["path"]
    if rel.endswith("MainActivity.java"):
        continue
    assert sha(root / rel) == entry["afterSha256"], rel

main_path = root / "app/src/main/java/com/marketmarney/mobile/MainActivity.java"
main = main_path.read_text(encoding="utf-8")
build = (root / "app/build.gradle").read_text(encoding="utf-8")
install_build = (install_root / "app/build.gradle").read_text(encoding="utf-8")
assets = root / "app/src/main/assets"

required = [
    'labels={"Beranda","Berita","MarketMarney TV","Market Live","Social Marney"}',
    'paths={"/index.html",NEWS_PATH,"/index.html#mm-app-tv","/index.html#marketlive","/beranda-trader.html#mm44-feed"}',
    '"MarketMarney\\nTV":labels[i]',
    'c.drawRoundRect(2,4,22,19,3,3,p)',
    'private long tvReadyToken;',
    'private boolean tvReadyChecking;',
    'private boolean marketmarneyTvDocument(String url)',
    'private void probeMarketmarneyTv(WebView target,String url,long token)',
    "app.querySelector('.mm-tv-grid')",
    "app.querySelector('article.mm-tv-card')",
    "app.querySelector('section.mm-tv-learning')",
    "button.navbtn,button[data-page],button",
    'Log.i("MMAPP_TV","robust route injected tab=2 selector=navbtn/text")',
    'Log.i("MMAPP_TV","ready catalogue=MarketMarney TV")',
    'boolean waitingTv=tab==XAUWAR&&!firstPaint;',
    'private boolean socialLoginFlow;',
    'private void beginSocialLoginFlow()',
    'private void redirectSocialLoginToTimeline(WebView target,String url)',
    "fetch('/api/community/status',{credentials:'same-origin',cache:'no-store'})",
    "location.replace('/beranda-trader.html#mm44-feed')",
    'redirectSocialLoginToTimeline(v,url)',
    'state.putBoolean("socialLoginFlow",socialLoginFlow)',
    'state.getBoolean("socialLoginFlow",false)',
    'Log.i("MMAPP_SOCIAL","login flow checks authenticated session and returns to timeline")',
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
    'if(tab!=XAUWAR){navigate(XAUWAR);if(!(BASE+XAUWAR_PATH)',
    'xauContentToken',
    'xauContentProbeStarted',
]:
    assert forbidden not in main, f"Obsolete marker remains: {forbidden}"

assert "applicationId 'com.marketmarney.mobile.beta438'" in build
assert "versionCode 42" in build
assert "versionName '4.38.0-beta'" in build
assert "applicationId 'com.marketmarney.mobile.beta438tvfix'" in install_build
assert "versionCode 44" in install_build
assert "versionName '4.38.2-tvfix'" in install_build

expected_assets = {
    "assets/" + p.relative_to(assets).as_posix(): p
    for p in assets.rglob("*") if p.is_file()
}

base_apk = deliver / "Marney438-SocialTimeline-TVFix-TestBase.apk"
install_apk = deliver / "Marney438-SocialTimeline-TVFix.apk"
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
        for marker in [
            b"MarketMarneyAndroid/4.38 AppShell",
            b"MarketMarney TV",
            b"MMAPP_TV",
            b"MMAPP_SOCIAL",
            b"/api/community/status",
            b"/beranda-trader.html#mm44-feed",
            b"MM438_LAUNCH",
        ]:
            assert marker in dex, (apk.name, marker)

apk_digest = sha(install_apk)
(deliver / "Marney438-SocialTimeline-TVFix.sha256").write_text(
    apk_digest + "  Marney438-SocialTimeline-TVFix.apk\n", encoding="utf-8"
)
quality = Path("quality438fix")
quality.mkdir(exist_ok=True)
(quality / "static-report.json").write_text(json.dumps({
    "success": True,
    "base": "Marney 4.38 Fluid + MarketMarney TV",
    "requestedChanges": [
        "Social Marney login returns directly to Linimasa",
        "MarketMarney TV waits for the real catalogue and recovers safely",
    ],
    "installPackage": "com.marketmarney.mobile.beta438tvfix",
    "version": "4.38.2-tvfix",
    "apkSha256": apk_digest,
    "assetCount": len(expected_assets),
    "preservedFiles": len(manifest["preserved"]),
}, indent=2) + "\n", encoding="utf-8")
print("PASS: Social login timeline redirect and resilient MarketMarney TV verified")
print("APK SHA-256:", apk_digest)
