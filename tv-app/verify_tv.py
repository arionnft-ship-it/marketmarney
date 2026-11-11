#!/usr/bin/env python3
"""Verify that the Android TV tab opens a local shell backed by public video data."""
from pathlib import Path
import sys

root=Path(sys.argv[1] if len(sys.argv)>1 else 'android439')
java=root/'app/src/main/java/com/marketmarney/mobile/MainActivity.java'
s=java.read_text(encoding='utf-8')
required=[
    'labels={"Beranda","Berita","MarketMarney TV","Market Live","Social Marney"}',
    '"MarketMarney\\nTV":labels[i]',
    '"/__android43/marketmarney-tv"',
    'getAssets().open("marketmarney-tv.html")',
    "document.getElementById('mm-tv-root')",
    'MMAPP_TV',
    'ready tab=2 catalogue=MarketMarney TV',
    'probeMarketmarneyTv(target,url,xauContentToken)',
    'if("mm-app-tv".equals(h)&&tab!=XAUWAR)',
    'c.drawRoundRect(2,4,22,19,3,3,p)',
]
for t in required:
    assert t in s, f'Missing MarketMarney TV app marker: {t!r}'
assert 'labels={"Beranda","Berita","XAUWar","Market Live","Social Marney"}' not in s
assert 'paths={"/index.html",NEWS_PATH,XAUWAR_PATH' not in s
assert 'if(tab!=XAUWAR){navigate(XAUWAR);if(!(BASE+XAUWAR_PATH)' not in s
assert 'showFailure("EMPTY","Halaman MarketMarney TV tidak dapat ditampilkan.' in s
assert (root/'app/src/main/assets/marketmarney-tv.html').is_file()
tv=(root/'app/src/main/assets/marketmarney-tv.html').read_text(encoding='utf-8')
assert "fetch('/api/content'" in tv
assert 'id="mm-tv-root"' in tv
assert 'id="grid"' in tv
assert 'video.controls=true' in tv
assert "www.youtube-nocookie.com/embed/" in tv
print('PASS: TV bottom label, icon, local same-origin page, published video API, playback and retry UI')
