#!/usr/bin/env python3
from pathlib import Path

path=Path('android434/app/src/androidTest/java/com/marketmarney/mobile/Reels433LayoutTest.java')
text=path.read_text(encoding='utf-8')
old='assertTrue(script.contains("8000"));'
new='assertTrue(script.contains("5000"));'
assert text.count(old)==1,'legacy Reels timeout assertion changed unexpectedly'
path.write_text(text.replace(old,new,1),encoding='utf-8')
print('Updated legacy Reels timeout expectation to the 4.34 five-second recovery limit.')
