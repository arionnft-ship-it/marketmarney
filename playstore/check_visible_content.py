#!/usr/bin/env python3
"""Fail Play QA on visually empty WebView body (white OR black).

Checks the central WebView area only, excluding status/header/bottom navigation.
This is a basic screenshot smoke gate, not a replacement for human UX tests.
"""
from PIL import Image
import sys
from pathlib import Path

def inspect(path:Path):
    with Image.open(path) as im:
        rgb=im.convert('RGB')
        w,h=rgb.size
        if w<240 or h<480:
            raise ValueError('Unexpected emulator screenshot resolution')
        region=rgb.crop((int(w*.06),int(h*.18),int(w*.94),int(h*.77)))
        total=region.width*region.height
        visible=0
        almost_black=0
        for r,g,b in region.getdata():
            if min(r,g,b)<220:visible+=1
            if max(r,g,b)<38:almost_black+=1
        return visible/total, almost_black/total

if __name__=='__main__':
    path=Path(sys.argv[1])
    visible,black=inspect(path)
    print(f'{path.name}: visible-ink={visible:.5f}, nearly-black={black:.5f}')
    if visible<0.005:
        raise SystemExit('FAIL: central content blank/near-white; shell/header does not count')
    if black>0.985:
        raise SystemExit('FAIL: central content is a uniform black field; must display content or a native status')
    print('PASS: WebView content region has nonblank visible structure')
