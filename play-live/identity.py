"""Select the Play package and version on the reconstructed Live release."""
import sys
from pathlib import Path

app = Path(sys.argv[1]) / 'app'
gradle = app / 'build.gradle'
main = app / 'src/main/java/com/marketmarney/mobile/MainActivity.java'
label = app / 'src/main/res/values/strings.xml'

def edit(path, pairs):
    data = path.read_text()
    for old, new in pairs:
        if data.count(old) != 1:
            raise ValueError(f'{path}: ambiguous or missing {old}')
        data = data.replace(old, new)
    path.write_text(data)

edit(gradle, [
    ("applicationId 'com.marketmarney.mobile.beta438live5'", "applicationId 'com.marketmarney.mobile'"),
    ("versionName '4.38.5-beta'", "versionName '4.38.5'"),
    ('versionCode 47', 'versionCode 48'),
])
edit(label, [('MarketMarney Live Beta', 'MarketMarney')])
edit(main, [
    ('MarketMarney 4.38.5-beta', 'MarketMarney 4.38.5'),
    (
        '+(mainFailed?failureCode:firstPaint?"Tampil":"Memuat")+\n'
        '            "\\nPaket uji terpisah. Google Login native belum didaftarkan untuk beta ini.";',
        '+(mainFailed?failureCode:firstPaint?"Tampil":"Memuat");'
    )
])
for path in (app / 'src/androidTest').rglob('*.java'):
    before = path.read_text()
    after = before.replace('"com.marketmarney.mobile.beta438live5"', '"com.marketmarney.mobile"').replace('"4.38.5-beta"', '"4.38.5"')
    if before != after: path.write_text(after)
with gradle.open('a') as output:
    output.write("""
def uploadPath = System.getenv('MM_PLAY_KEYSTORE_PATH')
if (uploadPath) {
    android {
        signingConfigs {
            playUpload {
                storeFile file(uploadPath)
                storePassword System.getenv('MM_PLAY_STORE_PASSWORD')
                keyAlias System.getenv('MM_PLAY_KEY_ALIAS')
                keyPassword System.getenv('MM_PLAY_KEY_PASSWORD')
            }
        }
        buildTypes { release { signingConfig signingConfigs.playUpload } }
    }
}
""")
