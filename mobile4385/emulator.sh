#!/usr/bin/env bash
set -euo pipefail
apk=deliver/MarketMarney-4.38.5-Live.apk
package=com.marketmarney.mobile.beta438live5
suite_package=com.marketmarney.mobile
adb shell wm size 480x960
adb shell wm density 240
adb install -r "$apk"
adb install -r android438/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
adb logcat -c

run_tests() {
    local group=$1
    shift
    local names=()
    for name in "$@"; do names+=("$suite_package.$name"); done
    local selected
    selected=$(IFS=,; echo "${names[*]}")
    adb shell pm clear "$package" > /dev/null
    adb shell am instrument -w -r -e class "$selected" "$package.test/androidx.test.runner.AndroidJUnitRunner" | tee "$RUNNER_TEMP/mm-$group.txt"
    grep -Eq '^OK \([1-9][0-9]* tests?\)' "$RUNNER_TEMP/mm-$group.txt"
}
run_tests live-and-login SocialLoginTimelineTest LiveCaptureTest
run_tests reels Reels433LayoutTest
run_tests performance Reels434PerformanceTest Performance435Test Performance436Test Performance437Test Performance438Test
run_tests social Social429FullscreenTest Social428PerformanceTest LightOnly425Test ChromeGallery424Test SharedHome420Test AdaptGuardTest
