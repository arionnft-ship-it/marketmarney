#!/usr/bin/env bash
# Test the exact release bundle's generated APK on Android 16 without contacting Play Console.
set -euo pipefail
export MM_ADB_BIN
MM_ADB_BIN=$(type -P adb)
adb() { timeout -k 3 25 "$MM_ADB_BIN" "$@"; }
pkg=com.marketmarney.mobile
mkdir -p evidence
java -jar "$RUNNER_TEMP/bundletool-1.18.3.jar" install-apks --apks="$RUNNER_TEMP/marketmarney-universal.apks"
adb install -r android438/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
adb shell wm size 540x1080
adb shell wm density 240
adb shell pm clear "$pkg"
adb logcat -c
adb shell am start -W -n "$pkg/.MainActivity" | tee evidence/first-launch.txt
grep -Fq 'Status: ok' evidence/first-launch.txt
adb shell dumpsys package "$pkg" > "$RUNNER_TEMP/marketmarney-install.txt"
grep -E '^ *version(Code|Name)=|^ *flags=' "$RUNNER_TEMP/marketmarney-install.txt" > evidence/device-package.txt
grep -E 'versionCode=48.*targetSdk=36' evidence/device-package.txt
grep -Fq 'versionName=4.38.5' evidence/device-package.txt
test "$(adb shell getprop ro.build.version.sdk | tr -d '\r')" = 36

run_suite() {
    local label=$1
    shift
    local classes=()
    for name in "$@"; do classes+=("$pkg.$name"); done
    local selected
    selected=$(IFS=,; echo "${classes[*]}")
    timeout -k 3 25 "$MM_ADB_BIN" shell pm clear "$pkg" >/dev/null || return 1
    printf 'START %s at %s\n' "$label" "$(date -u +%T)"
    if ! timeout -k 8 210 "$MM_ADB_BIN" shell am instrument -w -r -e class "$selected" "$pkg.test/androidx.test.runner.AndroidJUnitRunner" \
        | tee "evidence/${label}.txt"; then
        timeout -k 2 12 "$MM_ADB_BIN" shell am force-stop "$pkg" || true
        return 1
    fi
    grep -Eq '^OK \([1-9][0-9]* tests?\)' "evidence/${label}.txt"
}
diagnostics() {
    adb logcat -d -v brief -s AndroidRuntime:E > evidence/runtime-errors.txt || true
    adb logcat -d -v brief -s MMAPP_HOME:I MMAPP_SOCIAL:I MMAPP_TV:I > evidence/navigation-log.txt || true
}
trap diagnostics EXIT

status=0
run_suite home HomeDisplayTest || status=1
run_suite login SocialLoginTimelineTest || status=1
run_suite live LiveCaptureTest || status=1
run_suite reels Reels433LayoutTest || status=1
run_suite cold-home HomeColdStartTest || status=1
adb pull "/sdcard/Android/data/$pkg/files/qa-home" evidence/home || status=1
if [[ -s evidence/home/home.png ]]; then
    cp evidence/home/home.png evidence/01-beranda.png
    python3 play-live/check_visible_content.py evidence/01-beranda.png || status=1
else
    status=1
fi
adb shell pm clear "$pkg" >/dev/null
adb shell am start -W -n "$pkg/.MainActivity" --ei startTab 4 > evidence/social-launch.txt
sleep 4
adb exec-out screencap -p > evidence/02-social.png
diagnostics
if grep -Fq 'FATAL EXCEPTION' evidence/runtime-errors.txt; then
    echo 'Android fatal exception during release smoke' >&2; exit 1
fi
exit "$status"
