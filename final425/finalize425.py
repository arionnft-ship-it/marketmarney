#!/usr/bin/env python3
"""Finalize the shared Home/Market router after the verified 4.25 patch."""
from pathlib import Path
import hashlib
import json
import sys

root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('android425')
source = root / 'app/src/main/java/com/marketmarney/mobile/MainActivity.java'
text = source.read_text()
old = '''        String script="(function(){if(location.href!=="+JSONObject.quote(document)+"||document.readyState!=='complete')return false;"+
            "var nav=document.getElementById('nav'),button=nav&&nav.querySelector('button[data-page=\\\""+page+"\\\"]');"+
            "if(!button||typeof button.onclick!=='function')return false;"+
            "try{button.click();return location.href==="+JSONObject.quote(document)+"&&button.classList.contains('active');}catch(e){return false;}})()";'''
new = '''        String script="(function(){if(location.href!=="+JSONObject.quote(document)+"||document.readyState!=='complete')return false;"+
            "var nav=document.getElementById('nav'),button=nav&&nav.querySelector('button[data-page=\\\""+page+"\\\"]');"+
            "if(!button||!button.isConnected)return false;"+
            "try{button.click();return location.href==="+JSONObject.quote(document)+"&&button.isConnected;}catch(e){return false;}})()";'''
assert text.count(old) == 1, 'Expected the original strict shared-index router exactly once'
source.write_text(text.replace(old, new, 1))

manifest_path = Path('verified425.json')
manifest = json.loads(manifest_path.read_text())
digest = hashlib.sha256(source.read_bytes()).hexdigest()
matched = False
for entry in manifest['changed']:
    if entry['path'] == 'app/src/main/java/com/marketmarney/mobile/MainActivity.java':
        entry['afterSha256'] = digest
        matched = True
        break
assert matched, 'MainActivity entry missing from verified425 manifest'
manifest['finalized'] = {
    'sharedIndexRouter': 'supports onclick and addEventListener navigation without a WebView reload',
    'mainActivitySha256': digest,
}
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
print('Finalized 4.25 shared Home/Market router:', digest)
