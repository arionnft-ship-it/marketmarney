"""Apply the lightweight dimensional presentation change to verified Android 4.22."""
from pathlib import Path
import hashlib
import json
import sys

root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('android423')
patch = Path(__file__).resolve().parent
manifest = json.loads((patch / 'depth423-manifest.json').read_text())


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def safe(value):
    path = Path(value)
    assert not path.is_absolute() and '..' not in path.parts
    assert not any(part.startswith('.') for part in path.parts)
    return path


for entry in manifest['changed']:
    relative = safe(entry['path'])
    source, destination = patch / 'overrides' / relative, root / relative
    assert sha(source) == entry['afterSha256'], relative
    if entry['beforeSha256'] is None:
        assert not destination.exists(), relative
    else:
        assert sha(destination) == entry['beforeSha256'], relative

for relative, digest in manifest['preserved'].items():
    assert sha(root / safe(relative)) == digest, relative

for entry in manifest['changed']:
    relative = safe(entry['path'])
    destination = root / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes((patch / 'overrides' / relative).read_bytes())
    assert sha(destination) == entry['afterSha256'], relative

for relative, digest in manifest['preserved'].items():
    assert sha(root / safe(relative)) == digest, relative

Path('verified423.json').write_text(json.dumps(manifest, indent=2) + '\n')
print('Verified 4.23 depth patch:', len(manifest['changed']),
      'changed files;', len(manifest['preserved']), 'unchanged files.')
