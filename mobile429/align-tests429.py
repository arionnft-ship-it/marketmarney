#!/usr/bin/env python3
from pathlib import Path
root=Path('android429/app/src/androidTest/java')
changed=0
for path in root.rglob('*.java'):
    text=path.read_text(encoding='utf-8')
    updated=text.replace('4.28.0-beta','4.29.0-beta')
    if updated!=text:
        path.write_text(updated,encoding='utf-8')
        changed+=1
assert changed>=2, changed
print(f'Aligned {changed} inherited report test files with 4.29.0-beta')
