#!/usr/bin/env bash
# Focused Android 16 test: open MarketMarney TV directly as tab 2.
# Home startup has a separate known CI failure and is not a prerequisite here.
set -euo pipefail
PKG=com.marketmarney.mobile
APK=qa/play-candidate-smoke.apk
mkdir -p qa
test -s "$APK"

collect(){
  adb logcat -d -v brief -s MMAPP_TV:V MMAPP_TV_NET:V MM45_NAV:V MMPLAY_PAGE:V MMPLAY_UI:V MMPLAY_DIAG:V chromium:E > qa/play-tv-diagnostics.txt 2>/dev/null || true
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
for count in $(seq 1 45); do
  adb logcat -d -v brief -s MMAPP_TV:I > qa/play-tv-selection.txt
  if grep -F 'ready tab=2 catalogue=MarketMarney TV' qa/play-tv-selection.txt; then
    break
  fi
  sleep 1
done
grep -F 'ready tab=2 catalogue=MarketMarney TV' qa/play-tv-selection.txt || {
  echo 'FAIL: Published TV catalogue did not render video cards from live API or bundled public snapshot'
  exit 1
}
adb logcat -d -v brief -s MMAPP_TV_NET:V > qa/play-tv-native-source.txt || true
if grep -F 'source=bundled-snapshot' qa/play-tv-native-source.txt; then
  echo 'CATALOGUE_SOURCE=bundled-snapshot; streaming requires online test' | tee qa/play-tv-source-summary.txt
elif grep -F 'source=native-live' qa/play-tv-native-source.txt; then
  echo 'CATALOGUE_SOURCE=native-live; streaming still requires separate playback test' | tee qa/play-tv-source-summary.txt
else
  echo 'CATALOGUE_SOURCE=webview-or-unknown; verify API in full regression' | tee qa/play-tv-source-summary.txt
fi

# UIAutomator waits for the rendered frame, while logs may precede first paint.
# Require actual visible video buttons in the WebView's accessibility hierarchy.
adb shell uiautomator dump /sdcard/mm-tv-ui.xml > qa/play-tv-ui-dump.txt 2>&1 || true
adb exec-out cat /sdcard/mm-tv-ui.xml > qa/play-tv-ui.xml 2>/dev/null || true
grep -F '<hierarchy' qa/play-tv-ui.xml >/dev/null || {
  echo 'FAIL: cannot verify visible TV catalogue UI hierarchy'
  exit 1
}
if grep -F 'text="Menyiapkan XAUWar"' qa/play-tv-ui.xml; then
  echo 'FAIL: old XAUWar loading screen still visible'
  exit 1
fi
python3 tv-app/check_tv_visible_ui.py qa/play-tv-ui.xml
sleep 1
adb exec-out screencap -p > qa/play-tv-catalogue.png
test -s qa/play-tv-catalogue.png
python3 playstore/check_visible_content.py qa/play-tv-catalogue.png
python3 playstore/check_native_overlay.py qa/play-tv-catalogue.png

# Exercise a real tap on the first visible video card to verify playback UI.
read TAP_X TAP_Y <<< "$(python3 tv-app/check_tv_visible_ui.py qa/play-tv-ui.xml --tap)"
adb shell input tap "$TAP_X" "$TAP_Y"
sleep 2
adb shell uiautomator dump /sdcard/mm-tv-player-ui.xml > qa/play-tv-player-ui-dump.txt 2>&1 || true
adb exec-out cat /sdcard/mm-tv-player-ui.xml > qa/play-tv-player-ui.xml 2>/dev/null || true
grep -F 'Kembali ke daftar video' qa/play-tv-player-ui.xml >/dev/null || {
  echo 'FAIL: video card did not open TV player UI'
  exit 1
}
adb exec-out screencap -p > qa/play-tv-player.png
test -s qa/play-tv-player.png
echo 'PASS: first published video card opens the playback interface' | tee qa/play-tv-player-status.txt

adb logcat -d -v time -s AndroidRuntime:E > qa/play-tv-crashes.txt
if grep -E 'FATAL EXCEPTION|Process: com\.marketmarney\.mobile|ANR in com\.marketmarney\.mobile' qa/play-tv-crashes.txt; then
  echo 'FAIL: Android app crash'
  exit 1
fi
echo 'PASS: MarketMarney TV displayed published video cards on Android 16 (live or bundled public snapshot)' | tee qa/play-tv-status.txt
