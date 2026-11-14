"""Set the installable beta identity on the reconstructed app and its regression suite."""
from pathlib import Path
import sys

project = Path(sys.argv[1]) / "app"
package = "com.marketmarney.mobile.beta438live5"
version = "4.38.5-beta"
gradle = project / "build.gradle"

def replace_value(path, old, new):
    source = path.read_text()
    if old not in source:
        raise ValueError(f"Missing {old!r} in {path}")
    path.write_text(source.replace(old, new))

replace_value(gradle, "applicationId 'com.marketmarney.mobile.beta438'", f"applicationId '{package}'")
replace_value(gradle, "versionCode 42", "versionCode 47")
replace_value(gradle, "versionName '4.38.0-beta'", f"versionName '{version}'")
replace_value(project / "src/main/res/values/strings.xml", "MarketMarney 4.38 Fluid", "MarketMarney Live Beta")
activity = project / "src/main/java/com/marketmarney/mobile/MainActivity.java"
replace_value(activity, "MarketMarney 4.38.0-beta", f"MarketMarney {version}")
for test in (project / "src/androidTest/java").rglob("*.java"):
    before = test.read_text()
    after = before.replace('"com.marketmarney.mobile.beta438"', f'"{package}"').replace('"4.38.0-beta"', f'"{version}"')
    if after != before:
        test.write_text(after)
