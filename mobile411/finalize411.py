"""Measured refinement: no artificial input delay; fix test instrumentation wrapper."""
from pathlib import Path
p=Path('android43/app/src/main/assets/news43.html');s=p.read_text()
a="let searchTimer; $('search').addEventListener('input',()=>{query=norm($('search').value.trim());limit=12;clearTimeout(searchTimer);searchTimer=setTimeout(()=>{if(!busy)render();},110);});window.addEventListener('pagehide',()=>clearTimeout(searchTimer),{once:true});"
b="$('search').addEventListener('input',()=>{query=norm($('search').value.trim());limit=12;if(!busy)render();});"
assert s.count(a)==1;s=s.replace(a,b,1);p.write_text(s)
p=Path('mobile411/test_ui411.py');s=p.read_text()
a='p.evaluate("window.parseCalls=0;const original=DOMParser.prototype.parseFromString;DOMParser.prototype.parseFromString=function(...x){window.parseCalls++;return original.apply(this,x)}")'
b='p.evaluate("()=>{window.parseCalls=0;const original=DOMParser.prototype.parseFromString;DOMParser.prototype.parseFromString=function(...x){window.parseCalls++;return original.apply(this,x)}}")'
assert s.count(a)==1;p.write_text(s.replace(a,b,1))
print('PASS: immediate indexed search; instrumentation no longer auto-invokes a DOMParser method')
