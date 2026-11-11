#!/usr/bin/env python3
"""Small deterministic cleanup after the v4 source transformation."""
from pathlib import Path

main = Path(__file__).resolve().parent / "app/src/main/java/com/marketmarney/mobile/MainActivity.java"
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

checks = {
    "single page method": text.count("private LinearLayout page(") == 1,
    "download lambda": "setDownloadListener((url, userAgent, disposition, mime, length)" in text,
    "no invalid method reference": "setDownloadListener(this::startDownload)" not in text,
    "balanced braces": text.count("{") == text.count("}"),
    "v4 marker": "MARNEY_ANDROID_V4" in text,
    "runtime marker retained": 'AppShell " + APP_BUILD' in text,
}
failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise RuntimeError("Marney v4 finalization failed: " + ", ".join(failed))
main.write_text(text, encoding="utf-8")
print({"marneyAndroidV4Finalized": True, "checks": checks})
