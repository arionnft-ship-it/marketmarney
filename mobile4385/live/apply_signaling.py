"""Use the APK's race-safe variant only for the known version of the Live client."""
from pathlib import Path
import shutil
import sys


def apply(root):
    source = root / "app/src/main"
    asset_name = "live-marney-v1.js"
    shutil.copyfile(Path(__file__).with_name(asset_name), source / "assets" / asset_name)
    resolver = source / "java/com/marketmarney/mobile/AppResources49.java"
    text = resolver.read_text()
    marker = '        if(file==null)return null;'
    scoped = '''        boolean liveV1 = "/assets/live-marney.js".equals(path)
                && "v=20261111-live-v1".equals(u.getEncodedQuery());
        if (liveV1) file = "live-marney-v1.js";
'''
    cache = 'h.put("Cache-Control",immutable?'
    if scoped not in text:
        if text.count(marker) != 1 or text.count(cache) != 1:
            raise ValueError("AppResources49 request resolver changed")
        text = text.replace(marker, scoped + marker, 1)
        text = text.replace(cache, 'h.put("Cache-Control",immutable && !liveV1?', 1)
        resolver.write_text(text)


if __name__ == "__main__":
    apply(Path(sys.argv[1]))
