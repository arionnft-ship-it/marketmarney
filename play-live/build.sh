#!/usr/bin/env bash
# Prepare the real AAB and an independently QA-signed universal APK from its splits.
set -euo pipefail
mkdir -p deliver evidence
bundletool="$RUNNER_TEMP/bundletool-1.18.3.jar"
curl -fsSL --retry 4 --retry-all-errors https://github.com/google/bundletool/releases/download/1.18.3/bundletool-all-1.18.3.jar -o "$bundletool"
echo "a099cfa1543f55593bc2ed16a70a7c67fe54b1747bb7301f37fdfd6d91028e29  $bundletool" | sha256sum -c -

provided=0
for value in "${MM_UPLOAD_KEYSTORE_B64:-}" "${MM_PLAY_STORE_PASSWORD:-}" "${MM_PLAY_KEY_ALIAS:-}" "${MM_PLAY_KEY_PASSWORD:-}"; do
    if [[ -n "$value" ]]; then provided=$((provided + 1)); fi
done
case "$provided" in
    0) signing_status=UNSIGNED ;;
    4) signing_status=SIGNED
       export MM_PLAY_KEYSTORE_PATH="$RUNNER_TEMP/marney-upload.keystore"
       umask 077
       printf '%s' "$MM_UPLOAD_KEYSTORE_B64" | base64 -d > "$MM_PLAY_KEYSTORE_PATH"
       ;;
    *) echo "Incomplete upload signing credentials" >&2; exit 1 ;;
esac
trap 'if [[ -n "${MM_PLAY_KEYSTORE_PATH:-}" ]]; then rm -f "$MM_PLAY_KEYSTORE_PATH"; fi' EXIT
gradle --no-daemon -p android438 :app:bundleRelease :app:assembleDebugAndroidTest
aab="deliver/MarketMarney-4.38.5-${signing_status}.aab"
cp android438/app/build/outputs/bundle/release/app-release.aab "$aab"
java -jar "$bundletool" validate --bundle="$aab" > evidence/bundle-validation.txt
python3 play-live/check_bundle.py "$aab" "$signing_status" "$bundletool"
if [[ "$signing_status" = SIGNED ]]; then
    jarsigner -verify "$aab" | tee evidence/bundle-signature.txt
    grep -Fq 'jar verified.' evidence/bundle-signature.txt
    keytool -printcert -jarfile "$aab" > evidence/upload-certificate.txt
    if grep -Fiq 'CN=Android Debug' evidence/upload-certificate.txt; then
        echo "Release AAB used Android Debug key" >&2; exit 1
    fi
fi

# Gradle signs the instrumentation APK with its ephemeral CI debug signing key.
# Sign only QA-delivered APK splits with that SAME key to allow instrumentation.
qa_store="$HOME/.android/debug.keystore"
test -s "$qa_store"
apks="$RUNNER_TEMP/marketmarney-universal.apks"
java -jar "$bundletool" build-apks --bundle="$aab" --output="$apks" --mode=universal --overwrite \
    --ks="$qa_store" --ks-key-alias=androiddebugkey --ks-pass=pass:android --key-pass=pass:android
unzip -p "$apks" universal.apk > deliver/MarketMarney-4.38.5-QA.apk
tools="$ANDROID_HOME/build-tools/35.0.0"
"$tools/apksigner" verify --verbose --print-certs deliver/MarketMarney-4.38.5-QA.apk > evidence/qa-apk-signature.txt
"$tools/aapt" dump badging deliver/MarketMarney-4.38.5-QA.apk > evidence/apk-badging.txt
grep -Fq "package: name='com.marketmarney.mobile' versionCode='48' versionName='4.38.5'" evidence/apk-badging.txt
grep -Fq "targetSdkVersion:'36'" evidence/apk-badging.txt
if grep -Fq application-debuggable evidence/apk-badging.txt; then echo 'QA APK is a debug variant' >&2; exit 1; fi
(cd deliver && sha256sum *.aab *.apk > SHA256SUMS.txt)
