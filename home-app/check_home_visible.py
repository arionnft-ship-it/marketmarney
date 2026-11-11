#!/usr/bin/env python3
"""Verify visible Android WebView Home content via accessibility, without OCR."""
from pathlib import Path
from xml.etree import ElementTree as ET
import sys

path = Path(sys.argv[1])
root = ET.fromstring(path.read_text(encoding="utf-8"))
nodes = list(root.iter("node"))
texts = [node.get("text", "") for node in nodes]
webviews = [n for n in nodes if n.get("class") == "android.webkit.WebView"]
found = {
    "WebView": bool(webviews),
    "Home hero": any("Informasi pasar." in text for text in texts),
    "Home news CTA": any("Baca berita" in text for text in texts),
    "TV CTA": any("MarketMarney TV" in text for text in texts),
    "Education panel": any("Belajar di MarketMarney TV" in text for text in texts),
}
for key, value in found.items():
    print(f"{key}: {'PASS' if value else 'FAIL'}")
if not all(found.values()):
    raise SystemExit("FAIL: Home may be blank or only native tabs are visible")
print("PASS: APK Home hero, navigation links and educational content are visible")
