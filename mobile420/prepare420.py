"""Apply the reviewed 4.20 repair to the exact reconstructed 4.19 source.

The manifest checks both input and output hashes. Source and protected binary
branding assets stay reproducible without depending on an expiring CI artifact.
"""
import hashlib
import json
from pathlib import Path
import sys

root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('android420')
patch = Path(__file__).resolve().parent
manifest = json.loads((patch / 'repair420-manifest.json').read_text())

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def safe(path):
    value = Path(path)
    assert not value.is_absolute() and '..' not in value.parts
    assert not any(part.startswith('.') for part in value.parts)
    return value

for entry in manifest['changed']:
    relative = safe(entry['path'])
    source = patch / 'overrides' / relative
    destination = root / relative
    assert sha(source) == entry['afterSha256'], relative
    if entry['beforeSha256'] is None:
        assert not destination.exists(), relative
    else:
        assert sha(destination) == entry['beforeSha256'], relative

for relative, digest in manifest['preserved'].items():
    assert sha(root / safe(relative)) == digest, relative

for entry in manifest['changed']:
    destination = root / safe(entry['path'])
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes((patch / 'overrides' / entry['path']).read_bytes())
    assert sha(destination) == entry['afterSha256']

main = (root / 'app/src/main/java/com/marketmarney/mobile/MainActivity.java').read_text()
assert 'MarketMarneyAndroid/4.20' in main
assert 'addJavascriptInterface' not in main and 'handler.cancel()' in main
assert 'while(retained.size()>1)' in main and 'if(tab==XAUWAR)return false;' in main
assert 'com.marketmarney.mobile.beta420' in (root / 'app/build.gradle').read_text()
assert sha(root / 'app/src/main/assets/brand417/logo.png') == '4ae1790f464e5bd93719e795af1f6ab61a316a110768dc77ed9577514ea14cca'
for relative, digest in manifest['preserved'].items():
    assert sha(root / relative) == digest, relative

Path('verified420.json').write_text(json.dumps(manifest, indent=2))
print('Verified 4.20 repair:', len(manifest['changed']), 'changed files;', len(manifest['preserved']), 'unchanged source files; current logo preserved.')
