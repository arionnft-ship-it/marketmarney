#!/usr/bin/env python3
"""Verify that the Android TV tab opens a local shell backed by public video data."""
from pathlib import Path
import sys
import json

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
assert 'showFailure("EMPTY","Daftar video MarketMarney TV belum dapat ditampilkan.' in s
assert (root/'app/src/main/assets/marketmarney-tv.html').is_file()
tv=(root/'app/src/main/assets/marketmarney-tv.html').read_text(encoding='utf-8')
assert "fetch('/api/content'" in tv
assert 'id="mm-tv-root"' in tv
assert 'id="grid"' in tv
assert 'video.controls=true' in tv
assert "www.youtube-nocookie.com/embed/" in tv
assert "window.MMNativeTvReceive" in tv
assert "renderCatalogue(data,source)" in tv
assert 'requestNativeTvCatalogue(v,url)' in s
assert 'boundedText(in,2_000_000)' in s
assert 'publishedTvPayload' in s
assert 'bundled-snapshot' in s
snapshot=(root/'app/src/main/assets/marketmarney-tv-catalogue.json')
assert snapshot.is_file(), 'Android TV public fallback snapshot is missing'
data=json.loads(snapshot.read_text(encoding='utf-8'))
assert data['source']=='public-catalogue-snapshot'
videos=data['videos']
assert len(videos)>0, 'No published TV videos in bundled snapshot'
assert all(v.get('status')=='published' and v.get('url') for v in videos)
print(f"PASS: TV label, local page, video API, native fallback, snapshot={len(videos)} published clips")
