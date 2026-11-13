#!/usr/bin/env python3
"""Verify the Marney 4.38 UI is preserved while Social return and TV routing are fixed."""
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


# All approved Marney 4.38 files stay byte-identical except MainActivity.java.
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

required = [
    'labels={"Beranda","Berita","MarketMarney TV","Market Live","Social Marney"}',
    'SOCIAL_FEED_PATH = "/beranda-trader.html#mm44-feed"',
    'paths={"/index.html",NEWS_PATH,"/index.html#tv","/index.html#marketlive",SOCIAL_FEED_PATH}',
    '"MarketMarney\\nTV":labels[i]',
    'c.drawRoundRect(2,4,22,19,3,3,p)',
    'private boolean socialLoginReturnPending=false',
    'private String socialLoginUrl(Uri requested)',
    'next.appendQueryParameter("next",SOCIAL_FEED_PATH)',
    'private boolean profileSettings(Uri u)',
    'private void returnToSocialFeed()',
    'if(tab==SOCIAL||socialLoginReturnPending)returnToSocialFeed()',
    'if("/akun.html".equals(p)&&tab==SOCIAL&&!profileSettings(u))',
    'if(next==null||next.trim().isEmpty()){open(socialLoginUrl(u));return true;}',
    'if(("tv".equals(h)||"mm-app-tv".equals(h))&&tab!=XAUWAR)',
    'if(directFeed&&!"mm44-feed".equals(h))',
    "document.addEventListener('mm80-account-session',go)",
    "document.addEventListener('mm36-account-login'",
    'setMediaPlaybackRequiresUserGesture(!(tab==XAUWAR||"/beranda-trader.html".equals(expected.getPath())))',
    "location.hash!=='#tv'",
    "button[data-page=\\\"MarketMarney TV\\\"]",
    "a[href=\\\"#tv\\\"]",
    "text.indexOf('album video')",
    "text.indexOf('semua video')",
    "document.documentElement.dataset.mmAppTv='ready'",
    'Log.i("MMAPP_TV","canonical route injected hash=tv tab=2")',
    'state.putBoolean("socialLoginReturnPending",socialLoginReturnPending)',
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
    '"/index.html#mm-app-tv","/index.html#marketlive"',
    'if(tab!=XAUWAR){navigate(XAUWAR);if(!(BASE+XAUWAR_PATH)',
    '.setPositiveButton("Masuk di aplikasi",(d,w)->open(BASE+"/akun.html"))',
    '@Override public void onSignedIn(String username){dropRetained();if(!destroyed&&tab==SOCIAL&&web!=null)web.reload();}',
]:
    assert forbidden not in main, f"Obsolete behavior still present: {forbidden}"

assert "applicationId 'com.marketmarney.mobile.beta438'" in build
assert "versionCode 42" in build
assert "versionName '4.38.0-beta'" in build
assert "applicationId 'com.marketmarney.mobile.beta438tvfix'" in install_build
assert "versionCode 44" in install_build
assert "versionName '4.38.2-social-tv'" in install_build

expected_assets = {
    "assets/" + p.relative_to(assets).as_posix(): p
    for p in assets.rglob("*") if p.is_file()
}

base_apk = deliver / "Marney438-Fix-TestBase.apk"
install_apk = deliver / "Marney438-Social-TV-Fix.apk"
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
        assert b"/beranda-trader.html#mm44-feed" in dex
        assert b"/index.html#tv" in dex
        assert b"MMAPP_TV" in dex
        assert b"MM438_LAUNCH" in dex

apk_digest = sha(install_apk)
(deliver / "Marney438-Social-TV-Fix.sha256").write_text(
    apk_digest + "  Marney438-Social-TV-Fix.apk\n", encoding="utf-8"
)
quality = Path("quality438fix")
quality.mkdir(exist_ok=True)
(quality / "static-report.json").write_text(json.dumps({
    "success": True,
    "base": "Marney 4.38 Fluid",
    "changes": [
        "Social login returns to Linimasa",
        "MarketMarney TV uses canonical #tv route",
        "Approved visual assets preserved",
    ],
    "installPackage": "com.marketmarney.mobile.beta438tvfix",
    "version": "4.38.2-social-tv",
    "apkSha256": apk_digest,
    "assetCount": len(expected_assets),
    "preservedFiles": len(manifest["preserved"]),
}, indent=2) + "\n", encoding="utf-8")
print("PASS: Marney 4.38 UI preserved; Social feed return and TV route verified")
print("APK SHA-256:", apk_digest)
