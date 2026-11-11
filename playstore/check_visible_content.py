#!/usr/bin/env python3
"""Fail Play QA when the WebView content region is entirely blank.

The crop deliberately excludes Android status/nav bars and MarketMarney's
native bottom tabs. This is a safety-net smoke check, not a semantic review
of actual chart availability.
"""
from PIL import Image
import sys
from pathlib import Path

def visible_share(path:Path) -> float:
    with Image.open(path) as im:
        rgb=im.convert('RGB')
        w,h=rgb.size
        if w<240 or h<480:
            raise ValueError('Unexpected emulator screenshot resolution')
        # Central content area; no credit for shell/header/tab controls.
        region=rgb.crop((int(w*.06),int(h*.18),int(w*.94),int(h*.77)))
        pixels=region.getdata()
        total=region.width*region.height
        ink=sum(1 for r,g,b in pixels if min(r,g,b)<220)
        return ink/total

if __name__=='__main__':
    path=Path(sys.argv[1])
    ratio=visible_share(path)
    print(f'MarketMarney main-content nonblank pixel fraction: {ratio:.5f}')
    if ratio<0.005:
        raise SystemExit('FAIL: blank main content; progress bar and bottom tabs are not sufficient')
    print('PASS: visible center content exists in the Android screenshot')
