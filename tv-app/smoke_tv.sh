#!/usr/bin/env bash
# Run existing strict Play Android 16 smoke checks, then confirm TV catalogue.
set -euo pipefail
bash playstore/smoke-play-candidate.sh
adb logcat -d -v brief -s MMAPP_TV:I > qa/play-tv-selection.txt
grep -F 'ready tab=2 catalogue=MarketMarney TV' qa/play-tv-selection.txt
test -s qa/play-after-navigation.png
echo 'PASS: MarketMarney TV tab opened its verified live catalogue, not the retired XAUWar view' | tee qa/play-tv-status.txt
