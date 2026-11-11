#!/usr/bin/env python3
"""Remove the optional full-screen native loading CARD in Play candidate only.

The standard thin progress indicator and bounded error/retry UX remain.
Native overlays were reported ready/removed but a stale loading CARD persisted
visually in Android 16 emulator; do not mask real WebView content with that card.
Keep strict screenshot / DOM tests. No modifications to the website or beta APK.
"""
from pathlib import Path

def apply(root:Path)->None:
    path=root/"app/src/main/java/com/marketmarney/mobile/MainActivity.java"
    text=path.read_text(encoding="utf-8")
    before='''        if(tab==XAUWAR||tab==HOME||tab==MARKET)showXauLoading();else clearXauLoading();'''
    after='''        // Play-only: do not create a full-screen loading card over the WebView.
        // Retain the thin native progress bar and bounded error/retry state.
        clearXauLoading();'''
    if text.count(before)!=1:
        raise RuntimeError("Could not verify the exact full-screen loading trigger")
    text=text.replace(before,after,1)
    path.write_text(text,encoding="utf-8")

if __name__=="__main__":
    import sys
    apply(Path(sys.argv[1] if len(sys.argv)>1 else "android439"))
    print("Play candidate: full-screen loading card disabled; content readiness gates unchanged")
