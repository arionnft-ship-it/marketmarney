#!/usr/bin/env bash
# A side-by-side MarketMarney 4.40 debug BETA, not a signed Play release.
set -euo pipefail
PKG=com.marketmarney.mobile.beta440
APK=play_artifact/MarketMarney-4.40-Beta.apk
mkdir -p qa
test -s "$APK"

collect(){
  adb logcat -d -v brief -s MMAPP_HOME:I MMAPP_TV:I MMAPP_TV_NET:I MMPLAY_PAGE:I MM45_NAV:I AndroidRuntime:E > qa/beta440-diagnostics.txt 2>/dev/null || true
}
trap collect EXIT

adb wait-for-device
adb shell wm size 480x960
adb shell wm density 240
adb install -r "$APK" | tee qa/beta440-install.txt
grep -F "Success" qa/beta440-install.txt
adb shell pm clear "$PKG" >/dev/null
adb logcat -c
adb shell am start -W -n "$PKG/com.marketmarney.mobile.MainActivity" | tee qa/beta440-home-launch.txt
grep -E 'Status: ok|Status: warning' qa/beta440-home-launch.txt

for n in $(seq 1 26); do
  adb logcat -d -v brief -s MMAPP_HOME:I > qa/beta440-home-ready.txt
  if grep -F 'ready tab=0 lightweight-home' qa/beta440-home-ready.txt;then break;fi
  sleep 1
done
grep -F 'ready tab=0 lightweight-home' qa/beta440-home-ready.txt
# Always preserve visual evidence before accessibility assertions, so a
# native overlay or a white WebView cannot make the diagnosis disappear.
timeout 12s adb exec-out screencap -p > qa/beta440-home.png
test -s qa/beta440-home.png
python3 playstore/check_visible_content.py qa/beta440-home.png
python3 playstore/check_native_overlay.py qa/beta440-home.png
timeout 16s adb shell uiautomator dump /sdcard/mm-home-beta.xml > qa/beta440-home-ui-dump.txt 2>&1 || true
timeout 10s adb exec-out cat /sdcard/mm-home-beta.xml > qa/beta440-home-ui.xml 2>/dev/null || true
grep -F '<hierarchy' qa/beta440-home-ui.xml >/dev/null
python3 home-app/check_home_visible.py qa/beta440-home-ui.xml

# Real Android 16 launch into TV, not an inferred tap from screenshots.
adb shell am force-stop "$PKG"
adb logcat -c
adb shell am start -W -n "$PKG/com.marketmarney.mobile.MainActivity" --ei startTab 2 | tee qa/beta440-tv-launch.txt
grep -E 'Status: ok|Status: warning' qa/beta440-tv-launch.txt
for n in $(seq 1 42); do
  adb logcat -d -v brief -s MMAPP_TV:I > qa/beta440-tv-ready.txt
  if grep -F 'ready tab=2 catalogue=MarketMarney TV' qa/beta440-tv-ready.txt;then break;fi
  sleep 1
done
grep -F 'ready tab=2 catalogue=MarketMarney TV' qa/beta440-tv-ready.txt
adb shell uiautomator dump /sdcard/mm-tv-beta.xml > qa/beta440-tv-ui-dump.txt 2>&1 || true
adb exec-out cat /sdcard/mm-tv-beta.xml > qa/beta440-tv-ui.xml 2>/dev/null || true
grep -F '<hierarchy' qa/beta440-tv-ui.xml >/dev/null
python3 tv-app/check_tv_visible_ui.py qa/beta440-tv-ui.xml
adb exec-out screencap -p > qa/beta440-tv.png
python3 playstore/check_visible_content.py qa/beta440-tv.png

adb logcat -d -v time -s AndroidRuntime:E > qa/beta440-crashes.txt
if grep -E 'FATAL EXCEPTION|ANR in com\.marketmarney\.mobile\.beta440' qa/beta440-crashes.txt;then
  echo "FAIL: Android crash"; exit 1
fi
echo 'PASS: beta440 lightweight Home + published MarketMarney TV on Android 16; not a Play Store release' | tee qa/beta440-status.txt
