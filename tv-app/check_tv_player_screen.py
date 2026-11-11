#!/usr/bin/env python3
"""Detect a real, changed Android video-player screen (no OCR, no user data).

Called after an explicit tap on a visible published TV video card. This is a
limited UI-level test, not proof that the actual media stream played.
"""
from pathlib import Path
from PIL import Image, ImageChops
import sys


def compare(before: Path, after: Path) -> float:
    with Image.open(before) as a, Image.open(after) as b:
        if a.size != b.size or min(a.size) < 400:
            raise ValueError("Unexpected or mismatched Android screenshot sizes")
        w, h = a.size
        crop = (int(w * 0.04), int(h * 0.14), int(w * 0.96), int(h * 0.77))
        p1, p2 = a.convert("RGB").crop(crop), b.convert("RGB").crop(crop)
        delta = ImageChops.difference(p1, p2)
        count = sum(1 for rgb in delta.getdata() if max(rgb) >= 35)
        return count / (p1.width * p1.height)


if __name__ == "__main__":
    first, second = map(Path, sys.argv[1:3])
    changed = compare(first, second)
    print(f"Android TV player: changed-pixels={changed:.4f}")
    if changed < 0.16:
        raise SystemExit("FAIL: visible TV player did not replace catalogue UI")
    print("PASS: video-card tap visibly changed TV UI (media playback not verified)")
