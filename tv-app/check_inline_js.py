#!/usr/bin/env python3
"""Syntax-check inline Android TV JS with Node; no browser or network access."""
from pathlib import Path
import re
import subprocess
import sys
import tempfile

html=Path(sys.argv[1] if len(sys.argv)>1 else 'tv-app/marketmarney-tv.html').read_text(encoding='utf-8')
matches=re.findall(r'<script\b[^>]*>([\s\S]*?)</script>',html,flags=re.IGNORECASE)
assert len(matches)==1, f'Expected 1 owned inline script, got {len(matches)}'
assert 'window.MMNativeTvReceive' in matches[0]
with tempfile.TemporaryDirectory() as temp:
    script=Path(temp)/'marketmarney-tv.js'
    script.write_text(matches[0],encoding='utf-8')
    subprocess.run(['node','--check',str(script)],check=True)
print('PASS: MarketMarney TV inline JS syntax and native callback entrypoint')
