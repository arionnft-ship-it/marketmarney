#!/usr/bin/env python3
"""Validate that Marney functional upgrades keep the original interface intact."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MAIN = ROOT / "app/src/main/java/com/marketmarney/mobile/MainActivity.java"
MANIFEST = ROOT / "app/src/main/AndroidManifest.xml"
GRADLE = ROOT / "app/build.gradle"

source = MAIN.read_text(encoding="utf-8")
manifest = MANIFEST.read_text(encoding="utf-8")
gradle = GRADLE.read_text(encoding="utf-8")

checks = {
    "original navy palette": "private static final int NAVY = Color.rgb(5, 17, 33);" in source,
    "original card palette": "private static final int CARD = Color.rgb(12, 31, 51);" in source,
    "original gold palette": "private static final int GOLD = Color.rgb(255, 192, 59);" in source,
    "original header background": "top.setBackgroundColor(Color.rgb(6, 21, 38));" in source,
    "original header copy": "APLIKASI ANDROID  •  MARKET INTELLIGENCE" in source,
    "original bottom background": "bottomBar.setBackgroundColor(Color.rgb(8, 23, 39));" in source,
    "original navigation labels": 'String[] labels = {"Beranda", "Pasar", "Berita", "Social", "Akun"};' in source,
    "original navigation symbols": 'String[] symbols = {"⌂", "⌁", "▤", "◎", "◉"};' in source,
    "original hero styling": "hero.setBackground(bg(Color.rgb(21, 48, 68), 17));" in source,
    "original web toolbar": 'toolbar.setPadding(dp(10), dp(5), dp(15), dp(5));' in source,
    "no forced light theme": "mm_theme" not in source and "lightModeScript" not in source,
    "no replacement chrome": "setNativeChromeVisible" not in source,
    "preserved build marker": "MARNEY_ANDROID_V4_UI_PRESERVED" in source,
    "100 MB validation": "MAX_UPLOAD_BYTES = 100L * 1024L * 1024L" in source,
    "download support": "setDownloadListener" in source and "DownloadManager.Request" in source,
    "live media support": "onPermissionRequest(PermissionRequest request)" in source,
    "safe MarketMarney origin": "isTrustedMarketMarney" in source,
    "balanced braces": source.count("{") == source.count("}"),
    "single activity result": source.count("void onActivityResult(") == 1,
    "camera optional": '<uses-feature android:name="android.hardware.camera" android:required="false" />' in manifest,
    "microphone optional": '<uses-feature android:name="android.hardware.microphone" android:required="false" />' in manifest,
    "camera permission": 'android.permission.CAMERA' in manifest,
    "microphone permission": 'android.permission.RECORD_AUDIO' in manifest,
    "version code": "versionCode 6" in gradle,
    "version name": "versionName '4.0.1-beta'" in gradle,
}

failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise RuntimeError("Marney UI-preserved finalization failed: " + ", ".join(failed))

print({
    "marneyAndroidFinalized": True,
    "uiPreserved": True,
    "checks": checks,
})
