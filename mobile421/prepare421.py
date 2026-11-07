"""Apply the small 4.21 branding patch to the verified 4.20 source."""
from pathlib import Path
import hashlib,json,sys
root=Path(sys.argv[1]) if len(sys.argv)>1 else Path('android421')
patch=Path(__file__).resolve().parent
manifest=json.loads((patch/'branding421-manifest.json').read_text())
original_main=(root/'app/src/main/java/com/marketmarney/mobile/MainActivity.java').read_text()
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def safe(path):
 p=Path(path)
 assert not p.is_absolute() and '..' not in p.parts and not any(x.startswith('.') for x in p.parts)
 return p
for e in manifest['changed']:
 rel=safe(e['path']);source=patch/'overrides'/rel;dest=root/rel
 assert sha(source)==e['afterSha256'],rel
 if e['beforeSha256'] is None:assert not dest.exists(),rel
 else:assert sha(dest)==e['beforeSha256'],rel
for rel,digest in manifest['preserved'].items():assert sha(root/safe(rel))==digest,rel
for e in manifest['changed']:
 rel=safe(e['path']);dest=root/rel;dest.parent.mkdir(parents=True,exist_ok=True)
 dest.write_bytes((patch/'overrides'/rel).read_bytes());assert sha(dest)==e['afterSha256'],rel
for rel,digest in manifest['preserved'].items():assert sha(root/safe(rel))==digest,rel
updated_main=(root/'app/src/main/java/com/marketmarney/mobile/MainActivity.java').read_text()
normalized=updated_main.replace('4.21','4.20').replace("mmAndroid='421'","mmAndroid='420'").replace("s.dataset.revision!=='421'","s.dataset.revision!=='420'").replace("s.dataset.revision='421'","s.dataset.revision='420'")
assert normalized==original_main, 'Only release labels may change in MainActivity'
assert 'com.marketmarney.mobile.beta421' in (root/'app/build.gradle').read_text()
assert '@android:color/transparent' in (root/'app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml').read_text()
assert '<item name="android:windowSplashScreenIconBackgroundColor">@android:color/transparent</item>' in (root/'app/src/main/res/values-v31/styles.xml').read_text()
Path('verified421.json').write_text(json.dumps(manifest,indent=2))
print('Verified 4.21 branding patch:',len(manifest['changed']),'changed files;',len(manifest['preserved']),'unchanged files.')
