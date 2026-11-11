#!/usr/bin/env bash
# Android 16 smoke test for the separately prepared MarketMarney Play candidate.
# Test signing is disposable and MUST NOT be used for publishing.
set -euo pipefail

PKG=com.marketmarney.mobile
APK=qa/play-candidate-smoke.apk
OUT=qa
mkdir -p "$OUT"
test -s "$APK"

adb wait-for-device
adb shell wm size 480x960
adb shell wm density 240
adb install -r "$APK" | tee "$OUT/play-install.txt"
grep -F 'Success' "$OUT/play-install.txt"
adb shell pm clear "$PKG" >/dev/null
adb logcat -c

adb shell am start -W -n "$PKG/com.marketmarney.mobile.MainActivity" | tee "$OUT/play-first-launch.txt"
grep -E 'Status: ok|Status: warning' "$OUT/play-first-launch.txt"
sleep 3
adb shell pidof "$PKG" | tee "$OUT/play-process.txt"
test -s "$OUT/play-process.txt"
adb exec-out screencap -p > "$OUT/play-first-launch.png"
test -s "$OUT/play-first-launch.png"
# Capture the fully loaded Home DOM separately to inspect early light-only CSS.
sleep 4
adb exec-out screencap -p > "$OUT/play-home-after-7s.png"
test -s "$OUT/play-home-after-7s.png"
python3 playstore/check_visible_content.py "$OUT/play-home-after-7s.png"

# Test background/resume without triggering a new page.
adb shell input keyevent KEYCODE_HOME
sleep 1
adb shell am start -W -n "$PKG/com.marketmarney.mobile.MainActivity" | tee "$OUT/play-resume.txt"
sleep 1

# Force a fresh Activity instance with a trusted UI-test-only initial tab.
# A coordinate tap could land on the nav padding and leave the Home page visible,
# yielding a false positive for the blank XAUWar regression.
adb shell am force-stop "$PKG"
adb logcat -c
adb shell am start -W -n "$PKG/com.marketmarney.mobile.MainActivity" --ei startTab 2 | tee "$OUT/play-xauwar-start.txt"
sleep 2
adb logcat -d -v brief -s MM45_NAV:I > "$OUT/play-xauwar-route.txt"
grep -F 'cold tab=2' "$OUT/play-xauwar-route.txt"
adb shell pidof "$PKG" | tee "$OUT/play-after-navigation.txt"
test -s "$OUT/play-after-navigation.txt"
adb exec-out screencap -p > "$OUT/play-after-navigation.png"
test -s "$OUT/play-after-navigation.png"
python3 playstore/check_visible_content.py "$OUT/play-after-navigation.png"


adb logcat -d -v time -s AndroidRuntime:E > "$OUT/play-crashes.txt"
if grep -E 'FATAL EXCEPTION|Process: com\.marketmarney\.mobile|ANR in com\.marketmarney\.mobile' "$OUT/play-crashes.txt"; then
  echo 'FAIL: Production-package runtime crash detected'
  exit 1
fi
echo 'PASS: production-package Android smoke test (launch, resume, navigation, no fatal AndroidRuntime exception)' | tee "$OUT/play-smoke-status.txt"
