#!/usr/bin/env python3
"""Check the actual Android Accessibility UI tree for published TV cards.

No OCR and no account data. This fails if only a title/loading state is shown.
When called with --tap, output only the on-screen center of the first visible
video card, to exercise an authentic user tap on the video player.
"""
from pathlib import Path
import re
import sys
from xml.etree import ElementTree as ET

path=Path(sys.argv[1])
root=ET.fromstring(path.read_text(encoding='utf-8'))
items=list(root.iter('node'))
filters=[node for node in items if node.get('resource-id')=='filters']
cards=[node for node in items if node.get('class')=='android.widget.Button'
       and node.get('text','').startswith('Tonton ')]
status=[node for node in items if 'Mengambil daftar video' in node.get('text','')]
if not filters or len(cards)<1 or status:
    raise SystemExit(f'FAIL: TV cards not visible filters={len(filters)} cards={len(cards)} loading={len(status)}')

def coordinates(card):
    found=re.fullmatch(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]',card.get('bounds',''))
    if not found:return None
    x1,y1,x2,y2=map(int,found.groups())
    if x2-x1<100 or y2-y1<50 or y1>=780 or y2<=135:return None
    return (x1+x2)//2,(max(135,y1)+min(775,y2))//2

visible=[item for item in (coordinates(node) for node in cards) if item]
if not visible:
    raise SystemExit('FAIL: TV catalogue has no tappable visible video cards')
if '--tap' in sys.argv:
    print(*visible[0])
else:
    print(f'PASS: Android TV UI hierarchy contains {len(cards)} published video cards and category filter; first playable card in view')
