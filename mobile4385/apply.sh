#!/usr/bin/env bash
set -euo pipefail
project=$(realpath "$1")
here=$(cd "$(dirname "$0")" && pwd)
patch --batch --fuzz=0 -d "$project" -p1 < "$here/login/social-login.patch"
cp "$here/login/social-login.js" "$project/app/src/main/assets/"
cp "$here/login/SocialLoginTimelineTest.java" "$project/app/src/androidTest/java/com/marketmarney/mobile/"
python3 "$here/live/apply_live.py" "$project"
python3 "$here/live/apply_signaling.py" "$project"
node --check "$project/app/src/main/assets/live-marney-v1.js"
python3 "$here/identity.py" "$project"
node "$here/login/social-login.test.cjs" "$project/app/src/main/assets/social-login.js"
node --check "$project/app/src/main/assets/reels-live.js"
