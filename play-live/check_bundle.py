"""Validate the content and declared identity of the supplied AAB."""
from pathlib import Path
from subprocess import check_output
from zipfile import ZipFile
from xml.etree import ElementTree as ET
import sys

path, signing, tool = sys.argv[1:]
xml = check_output(['java', '-jar', tool, 'dump', 'manifest', f'--bundle={path}', '--module=base'])
root = ET.fromstring(xml)
android = '{http://schemas.android.com/apk/res/android}'
assert root.attrib['package'] == 'com.marketmarney.mobile'
assert root.attrib[android + 'versionCode'] == '48' and root.attrib[android + 'versionName'] == '4.38.5'
assert root.find('uses-sdk').attrib[android + 'targetSdkVersion'] == '36'
assert root.find('uses-sdk').attrib[android + 'minSdkVersion'] == '24'
app = root.find('application')
assert app.get(android + 'debuggable', 'false') == 'false'
assert app.get(android + 'allowBackup') == 'false' and app.get(android + 'usesCleartextTraffic') == 'false'
permissions = {node.get(android + 'name') for node in root.findall('uses-permission')}
assert {'android.permission.CAMERA', 'android.permission.RECORD_AUDIO'} <= permissions
with ZipFile(path) as archive:
    assert archive.testzip() is None
    names = archive.namelist()
    assert {'base/assets/live-marney-v1.js','base/assets/social-login.js','base/assets/reels-live.js'} <= set(names)
    certs = [name for name in names if name.upper().startswith('META-INF/') and name.upper().endswith(('.RSA','.EC','.DSA'))]
    assert bool(certs) == (signing == 'SIGNED')
    # This release has no native code. Alert if later source adds native libraries that need 16 KB validation.
    for name in names:
        with archive.open(name) as item:
            assert item.read(4) != b'\x7fELF', f'Native ELF needs 16 KB verification: {name}'
Path('evidence/bundle-manifest.xml').write_bytes(xml)
print(f'Validated {Path(path).name}: official identity, release manifest, media permissions and Live/Login assets')
