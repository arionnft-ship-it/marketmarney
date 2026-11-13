#!/usr/bin/env python3
"""Verify Marney 4.38 is preserved except for the requested XAUWar-to-TV tab."""
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


# Every prepared 4.38 file remains byte-identical except MainActivity.java,
# which contains the one requested menu/route replacement.
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
    'paths={"/index.html",NEWS_PATH,"/index.html#mm-app-tv","/index.html#marketlive","/beranda-trader.html#mm44-feed"}',
    '"MarketMarney\\nTV":labels[i]',
    'c.drawRoundRect(2,4,22,19,3,3,p)',
    'probeMarketmarneyTv(target,url,xauContentToken)',
    'MMAPP_TV',
    'ready tab=2 catalogue=MarketMarney TV',
    'if("mm-app-tv".equals(h)&&tab!=XAUWAR)',
    'tab==XAUWAR?"MarketMarney TV":tab==MARKET?',
    'tab==XAUWAR?"Menyiapkan daftar video. Anda tetap bisa berpindah menu."',
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
assert "applicationId 'com.marketmarney.mobile.beta438'" in build
assert "versionCode 42" in build
assert "versionName '4.38.0-beta'" in build
assert "applicationId 'com.marketmarney.mobile.beta438tv'" in install_build
assert "versionCode 43" in install_build
assert "versionName '4.38.1-tv'" in install_build

expected_assets = {
    "assets/" + p.relative_to(assets).as_posix(): p
    for p in assets.rglob("*") if p.is_file()
}

base_apk = deliver / "Marney438-TV-TestBase.apk"
install_apk = deliver / "Marney438-MarketMarneyTV.apk"
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
(deliver / "Marney438-MarketMarneyTV.sha256").write_text(
    apk_digest + "  Marney438-MarketMarneyTV.apk\n", encoding="utf-8"
)
quality = Path("quality438tv")
quality.mkdir(exist_ok=True)
(quality / "static-report.json").write_text(json.dumps({
    "success": True,
    "base": "Marney 4.38 Fluid",
    "requestedChange": "XAUWar -> MarketMarney TV",
    "installPackage": "com.marketmarney.mobile.beta438tv",
    "version": "4.38.1-tv",
    "apkSha256": apk_digest,
    "assetCount": len(expected_assets),
    "preservedFiles": len(manifest["preserved"]),
}, indent=2) + "\n", encoding="utf-8")
print("PASS: Marney 4.38 preserved; MarketMarney TV tab verified")
print("APK SHA-256:", apk_digest)
