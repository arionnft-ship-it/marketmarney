"""Verify Home by reading and opening a real publisher headline on the device."""
import html
import json
from pathlib import Path
import re
import subprocess
import sys
import time
from urllib.request import Request, urlopen
from xml.etree import ElementTree as ET


def adb(*args, binary=False):
    return subprocess.check_output(["adb", *args], timeout=18, text=not binary)


def nodes():
    path = "/sdcard/mm-play-home.xml"
    try:
        # Some A16 boots briefly return a null accessibility root with exit code zero.
        # Remove the previous document so a failed dump can never pass on stale UI.
        adb("shell", "rm", "-f", path)
        adb("shell", "uiautomator", "dump", path)
        source = adb("exec-out", "cat", path)
        start = source.find("<hierarchy")
        if start < 0:
            return []
        return ET.fromstring(source[start:]).findall(".//node")
    except (subprocess.SubprocessError, ET.ParseError):
        return []


def plain(value):
    return " ".join(html.unescape(re.sub(r"<[^>]+>", " ", str(value or ""))).split())


def label(element):
    return plain(element.get("text") or element.get("content-desc"))


def click(element):
    x1, y1, x2, y2 = map(int, re.findall(r"-?\d+", element.get("bounds", "")))
    if x2 - x1 < 10 or y2 - y1 < 10:
        raise AssertionError("Headline has no on-screen bounds")
    adb("shell", "input", "tap", str((x1+x2)//2), str((y1+y2)//2))


here = Path(__file__).resolve().parent
output = Path(sys.argv[1] if len(sys.argv)>1 else "qa/home")
output.mkdir(parents=True, exist_ok=True)
edition = json.loads((here/"home-edition.json").read_text())
stories = {plain(a["title"]): a for a in edition["articles"]}
try:
    req = Request("https://marketmarney.com/api/content", headers={"Accept":"application/json"})
    with urlopen(req, timeout=10) as response:
        fresh = json.load(response)["articles"]
    stories.update({plain(a["title"]):a for a in fresh if a.get("status","published")=="published" and a.get("title") and a.get("body")})
except (OSError, ValueError, KeyError) as exc:
    print("Current publisher response unavailable; comparing with dated packaged edition:",type(exc).__name__)

# Wake/unlock the clean fixture without drawing any UI over the tested Activity.
adb("shell", "input", "keyevent", "KEYCODE_WAKEUP")
adb("shell", "wm", "dismiss-keyguard")
for _ in range(15):
    screen = nodes()
    item = next((n for n in screen if label(n) in stories and n.get("visible-to-user","true")=="true"),None)
    if item is not None: break
    time.sleep(0.7)
else:
    (output/"failed-home.png").write_bytes(adb("exec-out","screencap","-p",binary=True))
    (output/"failed-home-window.txt").write_text(adb("shell","dumpsys","window","displays"))
    print("Observed final accessibility labels:", [label(n)[:120] for n in screen if label(n)][:20])
    raise SystemExit("Real publisher headline not found on Home")
article=stories[label(item)]
print("Home accessible headline matches published article",article["id"])
(output/"home.png").write_bytes(adb("exec-out","screencap","-p",binary=True))
click(item)
body = plain(article.get("body") or article.get("content") or "")
# Multiple paragraphs/elements can split text across nodes. Require a visible
# substantial passage from the article itself, not the headline or toolbar.
headline = plain(article["title"])
def passage(n):
    value=label(n)
    if value==headline or len(value)<28:return False
    return any(plain(value[i:i+48]).casefold() in body.casefold() for i in range(0,min(len(value)-27,220),10))
for _ in range(8):
    detail=nodes()
    if any(passage(n) for n in detail):break
    time.sleep(0.7)
else:
    (output/"failed-detail.png").write_bytes(adb("exec-out","screencap","-p",binary=True))
    print("Observed final accessibility labels:", [label(n)[:120] for n in detail if label(n)][:20])
    raise SystemExit("Tapped headline did not expose the article body")
(output/"article.png").write_bytes(adb("exec-out","screencap","-p",binary=True))
adb("shell","input","keyevent","KEYCODE_BACK")
for _ in range(6):
    if any(label(n) in stories for n in nodes()):break
    time.sleep(0.6)
else:raise SystemExit("Back did not return to a readable publisher headline")
print("PASS: visible publisher headline -> matching article passage -> Home")
