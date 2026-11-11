#!/usr/bin/env python3
"""Create a separate, explicitly non-Play sideload beta from the tested candidate.

The original release project remains intact. Gradle signs the debug-only beta
with its local debug key. This package is NOT a production update, and its
signature is not stable across CI rebuilds.
"""
from pathlib import Path
import shutil
import sys


def replace_one(text: str, old: str, new: str) -> str:
    if text.count(old) != 1:
        raise RuntimeError(f"Beta prepare source drift: {old!r}")
    return text.replace(old, new, 1)


def apply(src: Path, dest: Path) -> None:
    if dest.exists():
        raise RuntimeError(f"Target already exists: {dest}")
    shutil.copytree(
        src, dest,
        ignore=shutil.ignore_patterns("build", ".gradle", ".idea", "local.properties", "*.apk", "*.aab"),
    )
    gradle_file = dest / "app/build.gradle"
    gradle = gradle_file.read_text(encoding="utf-8")
    gradle = replace_one(gradle, "applicationId 'com.marketmarney.mobile'",
                         "applicationId 'com.marketmarney.mobile.beta440'")
    gradle = replace_one(gradle, "versionCode 44", "versionCode 45")
    gradle = replace_one(gradle, "versionName '4.39.0'", "versionName '4.40.0-beta'")
    # Do not carry production release signing block into a user preview. A
    # debug build signs via the Android debug config, never the Play upload key.
    signing_marker="// Play candidate signing: CI secrets only."
    if signing_marker in gradle:
        gradle = gradle[:gradle.index(signing_marker)]
    gradle_file.write_text(gradle, encoding="utf-8")
    strings_file = dest / "app/src/main/res/values/strings.xml"
    strings = strings_file.read_text(encoding="utf-8")
    strings = replace_one(strings, 'name="app_name">MarketMarney</string>',
                          'name="app_name">MarketMarney Beta</string>')
    strings_file.write_text(strings, encoding="utf-8")
    assert (dest / "app/src/main/assets/marketmarney-home.html").is_file()
    assert (dest / "app/src/main/assets/marketmarney-tv.html").is_file()
    print("PASS: independent beta440 preview, package separate from any published app")


if __name__ == "__main__":
    apply(Path(sys.argv[1] if len(sys.argv) > 1 else "android439"),
          Path(sys.argv[2] if len(sys.argv) > 2 else "android440beta"))
