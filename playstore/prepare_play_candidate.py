#!/usr/bin/env python3
"""Prepare a non-published Google Play candidate from the verified v4.39 beta.

Run AFTER the normal beta instrumentation tests. The tool does not publish to Play,
does not store credentials, and does not silently fall back to debug signing.
"""
from pathlib import Path
import json
import re
import sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else 'android439')
gradle_file = root / 'app/build.gradle'
manifest_file = root / 'app/src/main/AndroidManifest.xml'
strings_file = root / 'app/src/main/res/values/strings.xml'
main_file = root / 'app/src/main/java/com/marketmarney/mobile/MainActivity.java'

for path in (gradle_file, manifest_file, strings_file, main_file):
    if not path.is_file():
        raise SystemExit(f'Missing required Android source: {path}')

gradle = gradle_file.read_text(encoding='utf-8')
manifest = manifest_file.read_text(encoding='utf-8')
strings = strings_file.read_text(encoding='utf-8')
main = main_file.read_text(encoding='utf-8')

def replace_exact(text: str, old: str, new: str, name: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{name}: expected one instance of {old!r}, got {count}')
    return text.replace(old, new, 1)

# The Play package must be stable; the historical beta package is separate.
gradle = replace_exact(gradle, "applicationId 'com.marketmarney.mobile.beta439'", "applicationId 'com.marketmarney.mobile'", 'applicationId')
gradle = replace_exact(gradle, 'versionCode 43', 'versionCode 44', 'versionCode')
gradle = replace_exact(gradle, "versionName '4.39.0-beta'", "versionName '4.39.0'", 'versionName')
if not re.search(r'\btargetSdk\s+36\b', gradle):
    raise SystemExit('Play candidate must target Android API 36 or later')
if not re.search(r'\bcompileSdk\s+36\b', gradle):
    raise SystemExit('Play candidate must compile with API 36')
if 'android:usesCleartextTraffic="false"' not in manifest or 'android:allowBackup="false"' not in manifest:
    raise SystemExit('Mandatory secure manifest defaults not confirmed')

# An unsigned release AAB can be generated for review, never for upload.
# With all four upload-key environment values set, Gradle signs using that key.
signing = '''
// Play candidate signing: CI secrets only. Never use the debug keystore.
def mmPlayKeystore = System.getenv('MM_PLAY_KEYSTORE_PATH')
def mmPlayStorePassword = System.getenv('MM_PLAY_STORE_PASSWORD')
def mmPlayKeyAlias = System.getenv('MM_PLAY_KEY_ALIAS')
def mmPlayKeyPassword = System.getenv('MM_PLAY_KEY_PASSWORD')
if ([mmPlayKeystore, mmPlayStorePassword, mmPlayKeyAlias, mmPlayKeyPassword].every { it != null && it.length() > 0 }) {
    android {
        signingConfigs {
            playUpload {
                storeFile file(mmPlayKeystore)
                storePassword mmPlayStorePassword
                keyAlias mmPlayKeyAlias
                keyPassword mmPlayKeyPassword
            }
        }
        buildTypes {
            release { signingConfig signingConfigs.playUpload }
        }
    }
}
'''
if 'mmPlayKeystore' in gradle:
    raise SystemExit('Play signing block is already present')
gradle_file.write_text(gradle + signing, encoding='utf-8')
strings_file.write_text(replace_exact(strings, 'MarketMarney 4.39 Instant', 'MarketMarney', 'application label'), encoding='utf-8')
main_file.write_text(main.replace('MarketMarney 4.39.0-beta', 'MarketMarney 4.39.0'), encoding='utf-8')

out = root / 'play_candidate_metadata.json'
out.write_text(json.dumps({
    'applicationId': 'com.marketmarney.mobile',
    'versionCode': 44,
    'versionName': '4.39.0',
    'targetSdk': 36,
    'publication': 'NOT PUBLISHED',
    'googlePlaySigningRequired': True,
    'playConsoleDataSafetyAndPrivacyAuditRequired': True,
    'socialUserGeneratedContentAuditRequired': True,
    'realDeviceSmokeTestRequired': True,
}, indent=2) + '\n', encoding='utf-8')
print('Prepared Play release candidate: permanent app ID, API 36; no publication.')
