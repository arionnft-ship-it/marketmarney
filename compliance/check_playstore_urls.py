#!/usr/bin/env python3
"""Fail-closed public-policy URL preflight for the MarketMarney Play launch.

Read-only check. A passing URL check does NOT mean Google Play policy compliance:
the account deletion BACKEND, UGC moderation, data safety, and reviewer access
must still be independently exercised and approved.
"""
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

ROOT = "marketmarney.com"
checks = [
    ("privacy", "MM_PRIVACY_URL", ("privasi", "marketmarney")),
    ("account_deletion", "MM_ACCOUNT_DELETION_URL", ("akun", "hapus", "marketmarney")),
]
results = {}
errors = []

for kind, key, words in checks:
    url = os.environ.get(key, "").strip()
    record = {"url": url, "ok": False, "http": None, "checks": []}
    results[kind] = record
    try:
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme != "https" or parsed.hostname not in (ROOT, "www." + ROOT):
            raise ValueError(f"Set {key} to the exact live HTTPS MarketMarney page URL")
        req = urllib.request.Request(
            url, headers={"User-Agent": "MarketMarney-Play-Compliance-Preflight/1.0"}
        )
        with urllib.request.urlopen(req, timeout=15) as response:
            final = urllib.parse.urlparse(response.url)
            record["http"] = response.status
            if final.scheme != "https" or final.hostname not in (ROOT, "www." + ROOT):
                raise ValueError("Redirected outside the approved HTTPS domain")
            if "text/html" not in response.headers.get("Content-Type", ""):
                raise ValueError("Expected an HTML policy webpage")
            html = response.read(256_000).decode("utf-8", "replace").lower()
            if any(fragment not in html for fragment in words):
                raise ValueError("Expected policy/deletion terms not found: " + ", ".join(words))
            if any(marker in html for marker in ("lorem ipsum", "todo: add", "[insert privacy")):
                raise ValueError("Unfinished policy placeholder detected")
            record["ok"] = True
            record["checks"] = ["HTTPS MarketMarney", "HTTP 200", "HTML", "content keyword check"]
    except (ValueError, OSError, urllib.error.URLError) as exc:
        errors.append(f"{kind}: {exc}")
        record["error"] = str(exc)

print(json.dumps({"status": "PASS_URL_PREFLIGHT" if not errors else "BLOCKED",
                  "results": results, "limitations": [
                      "A URL passing is NOT proof that deletion actually deletes user data",
                      "A URL passing is NOT proof that privacy disclosures reflect real data flows",
                      "UGC reports, blocks, and moderation must be tested end to end"
                  ]}, indent=2, ensure_ascii=False))
if errors:
    sys.exit(2)
