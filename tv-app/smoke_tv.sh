#!/usr/bin/env bash
# Focused Android 16 test: open MarketMarney TV directly as tab 2.
# Home startup has a separate known CI failure and is not a prerequisite here.
set -euo pipefail
PKG=com.marketmarney.mobile
APK=qa/play-candidate-smoke.apk
mkdir -p qa
test -s "$APK"

collect(){
  adb logcat -d -v brief -s MMAPP_TV:V MM45_NAV:V MMPLAY_PAGE:V MMPLAY_UI:V MMPLAY_DIAG:V chromium:E > qa/play-tv-diagnostics.txt 2>/dev/null || true
  adb logcat -d -v time -s AndroidRuntime:E > qa/play-tv-androidruntime.txt 2>/dev/null || true
}
trap collect EXIT

adb wait-for-device
adb shell wm size 480x960
adb shell wm density 240
adb install -r "$APK" | tee qa/play-tv-install.txt
grep -F 'Success' qa/play-tv-install.txt
adb shell pm clear "$PKG" >/dev/null
adb logcat -c

adb shell am start -W -n "$PKG/com.marketmarney.mobile.MainActivity" --ei startTab 2 | tee qa/play-tv-launch.txt
grep -E 'Status: ok|Status: warning' qa/play-tv-launch.txt
adb shell pidof "$PKG" > qa/play-tv-process.txt
test -s qa/play-tv-process.txt

# Ensure native routing actually selected the third tab.
adb logcat -d -v brief -s MM45_NAV:I > qa/play-tv-route.txt
if ! grep -F 'cold tab=2' qa/play-tv-route.txt; then
  sleep 1
  adb logcat -d -v brief -s MM45_NAV:I > qa/play-tv-route.txt
  grep -F 'cold tab=2' qa/play-tv-route.txt
fi

# App WebView asserts the live SPA has selected MarketMarney TV and rendered
# the TV catalogue's actual .mm-tv-filters content before logging readiness.
for count in $(seq 1 35); do
  adb logcat -d -v brief -s MMAPP_TV:I > qa/play-tv-selection.txt
  if grep -E 'ready tab=2 catalogue=MarketMarney TV|shell tab=2 (loading=videos|catalogue=unavailable)' qa/play-tv-selection.txt; then
    break
  fi
  sleep 1
done
grep -E 'ready tab=2 catalogue=MarketMarney TV|shell tab=2 (loading=videos|catalogue=unavailable)' qa/play-tv-selection.txt || {
  echo 'FAIL: TV catalogue was never selected/rendered'
  exit 1
}

adb exec-out screencap -p > qa/play-tv-catalogue.png
test -s qa/play-tv-catalogue.png
python3 playstore/check_visible_content.py qa/play-tv-catalogue.png
python3 playstore/check_native_overlay.py qa/play-tv-catalogue.png

adb shell uiautomator dump /sdcard/mm-tv-ui.xml > qa/play-tv-ui-dump.txt 2>&1 || true
adb exec-out cat /sdcard/mm-tv-ui.xml > qa/play-tv-ui.xml 2>/dev/null || true
if grep -F '<hierarchy' qa/play-tv-ui.xml >/dev/null; then
  if grep -F 'text="Menyiapkan XAUWar"' qa/play-tv-ui.xml; then
    echo 'FAIL: old XAUWar loading screen still visible'
    exit 1
  fi
else
  echo 'INFO: UIAutomator hierarchy unavailable; screenshot + native TV DOM checks enforced'
fi

adb logcat -d -v time -s AndroidRuntime:E > qa/play-tv-crashes.txt
if grep -E 'FATAL EXCEPTION|Process: com\.marketmarney\.mobile|ANR in com\.marketmarney\.mobile' qa/play-tv-crashes.txt; then
  echo 'FAIL: Android app crash'
  exit 1
fi
if grep -F 'ready tab=2 catalogue=MarketMarney TV' qa/play-tv-selection.txt; then
  echo 'PASS: MarketMarney TV catalog loaded from public API on Android 16' | tee qa/play-tv-status.txt
else
  echo 'PASS: TV page opens with retry/status UI; public API video availability not verified' | tee qa/play-tv-status.txt
fi
