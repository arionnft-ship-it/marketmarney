#!/usr/bin/env python3
"""Small deterministic cleanup after the v4 source transformation."""
from pathlib import Path

root = Path(__file__).resolve().parent
main = root / "app/src/main/java/com/marketmarney/mobile/MainActivity.java"
manifest_path = root / "app/src/main/AndroidManifest.xml"
text = main.read_text(encoding="utf-8")

text = text.replace(
    "    private LinearLayout page(    private LinearLayout page(",
    "    private LinearLayout page(",
    1,
)
text = text.replace(
    "        browser.setDownloadListener(this::startDownload);",
    "        browser.setDownloadListener((url, userAgent, disposition, mime, length) -> "
    "startDownload(url, userAgent, disposition, mime));",
    1,
)
text = text.replace(
    '        setting.setUserAgentString(setting.getUserAgentString() + " MarketMarneyAndroid/4.0 AppShell");',
    '        setting.setUserAgentString(setting.getUserAgentString() + " MarketMarneyAndroid/4.0 AppShell " + APP_BUILD);',
    1,
)

manifest = manifest_path.read_text(encoding="utf-8")
camera_feature = '    <uses-feature android:name="android.hardware.camera" android:required="false" />\n'
if camera_feature not in manifest:
    anchor = '    <uses-feature android:name="android.hardware.camera.any" android:required="false" />\n'
    if anchor not in manifest:
        raise RuntimeError("Marney v4 finalization failed: camera feature anchor missing")
    manifest = manifest.replace(anchor, anchor + camera_feature, 1)

checks = {
    "single page method": text.count("private LinearLayout page(") == 1,
    "download lambda": "setDownloadListener((url, userAgent, disposition, mime, length)" in text,
    "no invalid method reference": "setDownloadListener(this::startDownload)" not in text,
    "balanced braces": text.count("{") == text.count("}"),
    "v4 marker": "MARNEY_ANDROID_V4" in text,
    "runtime marker retained": 'AppShell " + APP_BUILD' in text,
    "camera hardware optional": camera_feature.strip() in manifest,
}
failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise RuntimeError("Marney v4 finalization failed: " + ", ".join(failed))
main.write_text(text, encoding="utf-8")
manifest_path.write_text(manifest, encoding="utf-8")
print({"marneyAndroidV4Finalized": True, "checks": checks})
