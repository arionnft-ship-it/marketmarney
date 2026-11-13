#!/usr/bin/env python3
"""Detect MarketMarney's *native centered loading card* in emulator screenshots.

The 4.39 Play shell presents a centered M logo, pale blank header and
single loading card when the actual WebView is unavailable. Its logo and header
geometry are deliberately unlike the real Home/XAUWar UI.

This detects *a known overlay*, not text OCR or general page quality.
Always pair with semantic MMPLAY_PAGE ready logs and central-content checks.
"""
from pathlib import Path
import sys
from PIL import Image

def fraction(image, rect, predicate):
    width, height = image.size
    x1, y1, x2, y2 = rect
    crop = image.crop((int(x1*width), int(y1*height),
                       int(x2*width), int(y2*height))).convert("RGB")
    count = 0
    total = crop.width * crop.height
    for pixel in crop.getdata():
        if predicate(pixel):
            count += 1
    return count / max(1, total)

def audit(path):
    with Image.open(path) as image:
        if image.width < 400 or image.height < 800:
            raise ValueError("Unexpected Android emulator screenshot size")
        # Pale, almost empty upper area of the native loading screen.
        header_light = fraction(image, (0, .073, 1, .292),
                                lambda p: min(p) > 235)
        # Big centered black M used ONLY by the native loading overlay.
        centered_dark_logo = fraction(image, (.344, .208, .656, .375),
                                      lambda p: max(p) < 105)
        suspected_loader = header_light > .95 and centered_dark_logo > .07
        return header_light, centered_dark_logo, suspected_loader

if __name__ == "__main__":
    path = Path(sys.argv[1])
    try:
        upper, logo, blocked = audit(path)
    except (OSError, ValueError) as e:
        raise SystemExit(f"FAIL: cannot inspect Android screenshot: {e}")
    print(f"{path.name}: pale-header={upper:.4f} centered-dark-logo={logo:.4f}")
    if blocked:
        raise SystemExit("FAIL: native full-screen loading card remains visible; "
                         "app content is not visible even if WebView logged ready")
    print("PASS: known MarketMarney full-screen loading card not detected")
