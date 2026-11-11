#!/usr/bin/env python3
"""Verify that the Android TV tab opens the public MarketMarney TV SPA, not XAUWar."""
from pathlib import Path
import sys

root=Path(sys.argv[1] if len(sys.argv)>1 else 'android439')
java=root/'app/src/main/java/com/marketmarney/mobile/MainActivity.java'
s=java.read_text(encoding='utf-8')
required=[
    'labels={"Beranda","Berita","MarketMarney TV","Market Live","Social Marney"}',
    '"MarketMarney\\nTV":labels[i]',
    '"/index.html#mm-app-tv"',
    'button[data-page=\\"MarketMarney TV\\"]',
    "app.querySelector('.mm-tv-filters')",
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
assert 'showFailure("EMPTY","MarketMarney TV belum bisa dimuat.' in s
print('PASS: Android bottom TV label, two-line layout, play icon, actual SPA navigation, readiness and failure handling')
