#!/usr/bin/env bash
# Run in a clean checkout of the MarketMarney Android repository.
set -euo pipefail
archive=$(mktemp)
trap 'rm -f "$archive"' EXIT
cat mobile428/source.part{1..5} | base64 -d > "$archive"
echo "02d81f1767bada09a687d2ae5d08f0d07ec7b85f149943ddbfa40dffa3a479bf  $archive" | sha256sum -c -
tar -xzf "$archive" -C mobile428
echo '701601854939d00ec33097c4c483e20c3d3f576d8921d73f273d263c344dadfc  mobile419/base418-source.zip' | sha256sum -c -
unzip -q mobile419/base418-source.zip 'android417/*'
previous=417
for version in $(seq 419 438); do
    mv "android$previous" "android$version"
    python3 "mobile$version/prepare$version.py"
    case "$version" in
        425) python3 final425/finalize425.py ;;
        436) python3 mobile436/align_legacy_tests436.py ;;
    esac
    previous=$version
done
python3 mobile438/prepare438_tv.py android438
python3 mobile438/prepare438_social_tv_fix.py android438
