#!/usr/bin/env bash
# Android 16 smoke test for the separately prepared MarketMarney Play candidate.
# Test signing is disposable and MUST NOT be used for publishing.
set -euo pipefail

PKG=com.marketmarney.mobile
APK=qa/play-candidate-smoke.apk
OUT=qa
mkdir -p "$OUT"
test -s "$APK"

# Preserve non-sensitive renderer readiness diagnostics even on test failure.
collect_diagnostics(){
  adb logcat -d -v brief -s MMPLAY_DIAG:V MMPLAY_PAGE:V MMPLAY_UI:V MM45_NAV:V chromium:E chromium:W > "$OUT/play-readiness-diagnostics.txt" 2>/dev/null || true
  adb logcat -d -v brief -s AndroidRuntime:E > "$OUT/play-runtime-diagnostics.txt" 2>/dev/null || true
}
trap collect_diagnostics EXIT

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
adb logcat -d -s MMPLAY_PAGE:I > "$OUT/play-content-home.txt"
if ! grep -F 'ready tab=0' "$OUT/play-content-home.txt"; then
  echo 'Home WebView still rendering after 7s; allow final bounded content check'
  sleep 10
  adb logcat -d -s MMPLAY_PAGE:I > "$OUT/play-content-home.txt"
fi
adb exec-out screencap -p > "$OUT/play-home-after-7s.png"
test -s "$OUT/play-home-after-7s.png"
python3 playstore/check_visible_content.py "$OUT/play-home-after-7s.png"
# A populated native loading card has text and counts as nonblank pixels;
# verify accessibility hierarchy so it CANNOT fool the screenshot gate.
python3 playstore/check_native_overlay.py "$OUT/play-home-after-7s.png"
adb shell uiautomator dump /sdcard/play-home-ui.xml > "$OUT/play-home-ui-dump.txt" 2>&1 || true
adb exec-out cat /sdcard/play-home-ui.xml > "$OUT/play-home-ui.xml" 2>&1 || true
if grep -F '<hierarchy' "$OUT/play-home-ui.xml" >/dev/null; then
  if grep -F 'text="Memuat Beranda"' "$OUT/play-home-ui.xml"; then
    echo 'FAIL: Home native loading overlay still visible in accessibility tree'
    exit 1
  fi
else
  echo 'INFO: UIAutomator hierarchy unavailable; image-level overlay gate enforced'
fi
grep -F 'ready tab=0' "$OUT/play-content-home.txt" || { echo 'FAIL: Home did not display real web content'; exit 1; }

# Retain Home diagnostic evidence before starting XAUWar: its fresh-start check
# clears logcat, and otherwise only XAUWar diagnostics survive a passing run.
adb logcat -d -v brief -s MMPLAY_DIAG:V MMPLAY_PAGE:V MMPLAY_UI:V MM45_NAV:V chromium:E > "$OUT/play-home-readiness.txt" || true

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
adb logcat -d -s MMPLAY_PAGE:I > "$OUT/play-content-xauwar.txt"
if ! grep -F 'ready tab=2' "$OUT/play-content-xauwar.txt"; then
  echo 'XAUWar WebView still rendering; allow final bounded content check'
  sleep 11
  adb logcat -d -s MMPLAY_PAGE:I > "$OUT/play-content-xauwar.txt"
fi
adb exec-out screencap -p > "$OUT/play-after-navigation.png"
test -s "$OUT/play-after-navigation.png"
python3 playstore/check_visible_content.py "$OUT/play-after-navigation.png"
python3 playstore/check_native_overlay.py "$OUT/play-after-navigation.png"
adb shell uiautomator dump /sdcard/play-xauwar-ui.xml > "$OUT/play-xauwar-ui-dump.txt" 2>&1 || true
adb exec-out cat /sdcard/play-xauwar-ui.xml > "$OUT/play-xauwar-ui.xml" 2>&1 || true
if grep -F '<hierarchy' "$OUT/play-xauwar-ui.xml" >/dev/null; then
  if grep -F 'text="Menyiapkan XAUWar"' "$OUT/play-xauwar-ui.xml"; then
    echo 'FAIL: XAUWar native loading overlay still visible in accessibility tree'
    exit 1
  fi
else
  echo 'INFO: UIAutomator hierarchy unavailable; image-level overlay gate enforced'
fi
grep -F 'ready tab=2' "$OUT/play-content-xauwar.txt" || { echo 'FAIL: XAUWar did not display real web content'; exit 1; }


adb logcat -d -v time -s AndroidRuntime:E > "$OUT/play-crashes.txt"
if grep -E 'FATAL EXCEPTION|Process: com\.marketmarney\.mobile|ANR in com\.marketmarney\.mobile' "$OUT/play-crashes.txt"; then
  echo 'FAIL: Production-package runtime crash detected'
  exit 1
fi
echo 'PASS: production-package Android smoke test (launch, resume, navigation, no fatal AndroidRuntime exception)' | tee "$OUT/play-smoke-status.txt"
