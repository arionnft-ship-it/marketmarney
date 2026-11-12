#!/usr/bin/env python3
"""Verify Marney v4.1 stability features and lock the original visual fingerprint."""
from pathlib import Path
import hashlib

ROOT = Path(__file__).resolve().parent
MAIN = ROOT / "app/src/main/java/com/marketmarney/mobile/MainActivity.java"
MANIFEST = ROOT / "app/src/main/AndroidManifest.xml"
GRADLE = ROOT / "app/build.gradle"
EXPECTED_UI_SHA256 = "564f1d5226377e801cdf8bfcc9eda1a6828932c6ed84fc4d56af011f97b82692"

source = MAIN.read_text(encoding="utf-8")
manifest = MANIFEST.read_text(encoding="utf-8")
gradle = GRADLE.read_text(encoding="utf-8")


def method(signature: str) -> str:
    start = source.index(signature)
    brace = source.index("{", start)
    depth = 0
    for index in range(brace, len(source)):
        char = source[index]
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return source[start:index + 1]
    raise RuntimeError("Unclosed method: " + signature)


parts = []
for line in [
    "private static final int NAVY = Color.rgb(5, 17, 33);",
    "private static final int CARD = Color.rgb(12, 31, 51);",
    "private static final int CARD_ALT = Color.rgb(17, 40, 63);",
    "private static final int GOLD = Color.rgb(255, 192, 59);",
    "private static final int WHITE = Color.rgb(246, 248, 252);",
    "private static final int MUTED = Color.rgb(161, 183, 207);",
    "private static final int OUTLINE = Color.rgb(33, 63, 85);",
    "private static final int GREEN = Color.rgb(90, 211, 171);",
]:
    if line not in source:
        raise RuntimeError("Missing UI palette anchor: " + line)
    parts.append(line)

for signature in [
    "private Button button(",
    "private void buildHeader()",
    "private void drawBottomBar()",
    "private LinearLayout page(",
    "private LinearLayout card(",
    "private void linkCard(",
    "private void sectionTitle(",
    "private void home()",
    "private void markets()",
    "private void headlines()",
    "private void social()",
    "private void account()",
]:
    parts.append(method(signature))

web_start = source.index(
    "        LinearLayout panel = vertical();", source.index("private void showWeb(")
)
web_anchor = "        browser.setLayerType(View.LAYER_TYPE_HARDWARE, null);\n"
web_end = source.index(web_anchor, web_start) + len(web_anchor)
parts.append(source[web_start:web_end])
ui_sha256 = hashlib.sha256("\n\n".join(parts).encode("utf-8")).hexdigest()

checks = {
    "original visual fingerprint": ui_sha256 == EXPECTED_UI_SHA256,
    "v4.1 marker": "MARNEY_ANDROID_V4_1_STABLE_UI_PRESERVED" in source,
    "state restore": "STATE_WEB_BUNDLE" in source and "browser.restoreState" in source,
    "state save": "onSaveInstanceState(Bundle outState)" in source and "browser.saveState" in source,
    "renderer recovery": "onRenderProcessGone" in source and "RENDERER_RECOVERY_WINDOW_MS" in source,
    "renderer priority": "setRendererPriorityPolicy" in source,
    "live screen awake": "FLAG_KEEP_SCREEN_ON" in source,
    "lifecycle pause": "protected void onPause()" in source and "browser.onPause()" in source,
    "lifecycle resume": "protected void onResume()" in source and "browser.onResume()" in source,
    "robust multi-select": "ClipData clip = data.getClipData()" in source,
    "persisted chooser permission": "takePersistableUriPermission" in source,
    "100 MB limit retained": "MAX_UPLOAD_BYTES = 100L * 1024L * 1024L" in source,
    "download debounce": "DOWNLOAD_DEBOUNCE_MS" in source,
    "trusted origin": "trustedMarketMarneyUrl" in source,
    "no forced light theme": "lightModeScript" not in source and "mm_theme" not in source,
    "no replacement chrome": "setNativeChromeVisible" not in source,
    "balanced braces": source.count("{") == source.count("}"),
    "single activity result": source.count("void onActivityResult(") == 1,
    "camera optional": '<uses-feature android:name="android.hardware.camera" android:required="false" />' in manifest,
    "microphone optional": '<uses-feature android:name="android.hardware.microphone" android:required="false" />' in manifest,
    "camera permission": "android.permission.CAMERA" in manifest,
    "microphone permission": "android.permission.RECORD_AUDIO" in manifest,
    "version code": "versionCode 7" in gradle,
    "version name": "versionName '4.1.0-beta'" in gradle,
}
failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise RuntimeError("Marney v4.1 finalization failed: " + ", ".join(failed))

print({
    "marneyAndroidV41Finalized": True,
    "uiPreserved": True,
    "uiSha256": ui_sha256,
    "checks": checks,
})
