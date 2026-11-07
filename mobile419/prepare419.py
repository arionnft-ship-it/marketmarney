"""Reproduce Marney 4.19 from the verified final 4.18 source.

Only branding, visual styles, native touch feedback and version metadata change.
The source logo is the user's latest uploaded M + MARNEY PNG, without cropping.
"""
from pathlib import Path
from PIL import Image
import hashlib
import json
import re
import sys

base = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("android419")
patch = Path(__file__).resolve().parent
assets = base / "app/src/main/assets"
java = base / "app/src/main/java/com/marketmarney/mobile"
tests = base / "app/src/androidTest/java/com/marketmarney/mobile"

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

allowed = {
    "app/build.gradle", "README-MULAI-DISINI.md",
    "app/src/main/java/com/marketmarney/mobile/MainActivity.java",
    "app/src/main/res/values/strings.xml",
    "app/src/main/res/values/styles.xml",
    "app/src/main/res/values-v31/styles.xml",
    "app/src/main/res/drawable-nodpi/mm_brand_logo.png",
    "app/src/main/res/mipmap-xxxhdpi/ic_launcher.png",
    "app/src/main/assets/brand417/logo.png",
    "app/src/main/assets/premium411.css",
    "app/src/main/assets/social411/app.css",
    "app/src/main/assets/group48/navigation.css",
    "app/src/main/assets/profile49/app.css",
    "app/src/main/assets/news43.html",
    "app/src/androidTest/java/com/marketmarney/mobile/Branding417Test.java",
    "app/src/androidTest/java/com/marketmarney/mobile/Stability414Test.java",
}
before = {
    str(p.relative_to(base)): sha(p)
    for p in base.rglob("*")
    if p.is_file() and not any(x in p.parts for x in ("build", ".gradle", ".git"))
}
protected = {p: digest for p, digest in before.items() if p not in allowed}

original = patch / "logo.png"
assert sha(original) == "202d006f69e0953b7b2fee9196051d7be9c959919fd764925f5cfe2651f3d001"
assert sha(assets / "brand417/logo.png") == "0ef4d612aa83cfc830a32020ae1311aa59c5917eba24046673be4ea5fb3f20fb"
image = Image.open(original).convert("RGBA")
assert image.size == (1254, 1254)
logos = []
for relative, size in [
    ("app/src/main/assets/brand417/logo.png", 384),
    ("app/src/main/res/drawable-nodpi/mm_brand_logo.png", 512),
    ("app/src/main/res/mipmap-xxxhdpi/ic_launcher.png", 192),
]:
    target = base / relative
    old_bytes = target.stat().st_size
    image.resize((size, size), Image.Resampling.LANCZOS).save(target, optimize=True, compress_level=9)
    logos.append({"path": relative, "beforeBytes": old_bytes, "afterBytes": target.stat().st_size,
                  "dimensions": [size, size], "sha256": sha(target)})
assert (assets / "brand417/logo.png").stat().st_size < 180000

css = (patch / "premium419.css").read_text()
news_css = (patch / "news419.css").read_text()
for extra in (css, news_css):
    assert "@font-face" not in extra and "@keyframes" not in extra and "backdrop-filter" not in extra
for relative in ("premium411.css", "social411/app.css", "group48/navigation.css", "profile49/app.css"):
    target = assets / relative
    target.write_text(target.read_text() + "\n" + css)

target = assets / "news43.html"
news = target.read_text()
scripts_before = re.findall(r"<script\b[^>]*>(.*?)</script>", news, re.S)
assert news.count("</style>") == 1
news = news.replace("</style>", "\n" + news_css + "\n</style>", 1)
assert scripts_before == re.findall(r"<script\b[^>]*>(.*?)</script>", news, re.S)
target.write_text(news)

target = java / "MainActivity.java"
main = target.read_text()
def once(old, new):
    global main
    assert main.count(old) == 1, (old[:100], main.count(old))
    main = main.replace(old, new, 1)

once("GOLD=Color.rgb(239,194,122)", "GOLD=Color.rgb(255,184,77)")
once(
    "android.util.TypedValue ripple=new android.util.TypedValue();getTheme().resolveAttribute(android.R.attr.selectableItemBackground,ripple,true);cell.setBackgroundResource(ripple.resourceId);",
    "// Amber feedback uses the platform ripple; no extra animator or page work.\n"
    "            GradientDrawable rippleMask=new GradientDrawable();rippleMask.setColor(Color.WHITE);rippleMask.setCornerRadius(dp(18));\n"
    "            cell.setBackground(new android.graphics.drawable.RippleDrawable(android.content.res.ColorStateList.valueOf(lightSocial()?0x1fa66916:0x26ffb84d),null,rippleMask));"
)
once("pill.setColor(selected?(lightSocial()?Color.rgb(255,245,222):Color.rgb(48,46,34)):Color.TRANSPARENT);",
     "pill.setColor(selected?(lightSocial()?Color.rgb(255,243,220):Color.rgb(49,39,27)):Color.TRANSPARENT);")
once("pill.setStroke(dp(1),selected?(lightSocial()?Color.rgb(236,212,161):Color.rgb(109,88,51)):Color.TRANSPARENT);",
     "pill.setStroke(dp(1),selected?(lightSocial()?Color.rgb(235,205,151):Color.rgb(121,87,42)):Color.TRANSPARENT);")
for old, new in [
    ("MarketMarney 4.18.0-beta", "MarketMarney 4.19.0-beta"),
    ("MarketMarneyAndroid/4.18", "MarketMarneyAndroid/4.19"),
    ("version:'4.18'", "version:'4.19'"),
    ("dataset.mmAndroid='418'", "dataset.mmAndroid='419'"),
    ("s.dataset.revision!=='418'", "s.dataset.revision!=='419'"),
    ("s.dataset.revision='418'", "s.dataset.revision='419'"),
]:
    once(old, new)
target.write_text(main)

target = base / "app/build.gradle"
gradle = target.read_text()
for old, new in [
    ("applicationId 'com.marketmarney.mobile.beta418'", "applicationId 'com.marketmarney.mobile.beta419'"),
    ("versionCode 22", "versionCode 23"),
    ("versionName '4.18.0-beta'", "versionName '4.19.0-beta'"),
]:
    assert gradle.count(old) == 1
    gradle = gradle.replace(old, new, 1)
target.write_text(gradle)

target = base / "app/src/main/res/values/strings.xml"
target.write_text(re.sub(r'(<string name="app_name">)[^<]+', r'\g<1>Marney 4.19 Premium', target.read_text()))
for folder in ("values", "values-v31"):
    target = base / "app/src/main/res" / folder / "styles.xml"
    style = target.read_text()
    assert style.count("#F4BA42") == 1
    target.write_text(style.replace("#F4BA42", "#FFB84D"))

# Keep the existing binary identity and privacy-boundary tests truthful.
target = tests / "Branding417Test.java"
test = target.read_text()
old_hash = "0ef4d612aa83cfc830a32020ae1311aa59c5917eba24046673be4ea5fb3f20fb"
assert test.count(old_hash) == 1
target.write_text(test.replace(old_hash, sha(assets / "brand417/logo.png")))
target = tests / "Stability414Test.java"
test = target.read_text()
assert test.count("4.18.0-beta") == 1
target.write_text(test.replace("4.18.0-beta", "4.19.0-beta"))
(base / "README-MULAI-DISINI.md").write_text((patch / "Marney419-Panduan.md").read_text())

for relative, digest in protected.items():
    assert sha(base / relative) == digest, relative
changed = [relative for relative in before if sha(base / relative) != before[relative]]
assert set(changed).issubset(allowed)
assert "while(retained.size()>1)" in main and "if(tab==XAUWAR)return false;" in main
assert "addJavascriptInterface" not in main and "handler.cancel()" in main
assert 'labels={"Beranda","Berita","XAUWar","Market Live","Social Marney"}' in main
report = {
    "baseCommit": "deddedc2893f4ddf889aa06066679b295872be35",
    "sourceLogoSha256": sha(original),
    "preserved": protected,
    "changed": changed,
    "logos": logos,
    "newsScriptsPreserved": True,
    "featureScriptsAndManifestPreserved": True,
    "newRuntimeDependencies": 0,
    "newNetworkRequests": 0,
}
Path("preserved419.json").write_text(json.dumps(report, indent=2))
print("PASS:", len(protected), "source files unchanged;", len(changed), "allowed visual/branding/version changes.")
print("Latest uploaded artwork preserved intact at 384, 512 and 192 pixels.")
