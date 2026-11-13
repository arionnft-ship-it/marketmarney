#!/usr/bin/env python3
"""Build a bounded public-only MarketMarney TV fallback catalogue."""
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlparse, urljoin
from datetime import datetime, timezone
import json
import sys
import time

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else 'android438/app/src/main/assets/marketmarney-tv-catalogue.json')
ENDPOINT = 'https://marketmarney.com/api/content'
ALLOWED_KEYS = ('id','title','cat','date','desc','type','url','thumb','status')
MAX_BYTES = 2_000_000


def safe_url(value):
    if not isinstance(value, str):
        return ''
    parsed = urlparse(urljoin('https://marketmarney.com', value))
    allowed = {
        'marketmarney.com','www.marketmarney.com','youtu.be','youtube.com',
        'www.youtube.com','www.youtube-nocookie.com','i.ytimg.com'
    }
    return parsed.geturl() if parsed.scheme == 'https' and parsed.hostname in allowed else ''


def fetch_public():
    request = Request(ENDPOINT, headers={
        'User-Agent':'MarketMarney-Android-TV-Snapshot/1.1',
        'Accept':'application/json',
        'Accept-Encoding':'identity',
    })
    for attempt in range(3):
        try:
            with urlopen(request, timeout=20) as response:
                if response.status != 200 or 'json' not in response.headers.get('Content-Type','').lower():
                    raise ValueError('public catalogue response is not JSON/HTTP 200')
                raw = response.read(MAX_BYTES + 1)
                if len(raw) > MAX_BYTES:
                    raise ValueError('public catalogue exceeds size limit')
            decoded = json.loads(raw.decode('utf-8'))
            if not isinstance(decoded, dict) or not isinstance(decoded.get('videos'), list):
                raise ValueError('public catalogue has no videos array')
            return decoded['videos']
        except Exception:
            if attempt == 2:
                raise
            time.sleep(2)


clean = []
for video in fetch_public()[:200]:
    if not isinstance(video, dict) or video.get('status') != 'published':
        continue
    item = {key: video.get(key) for key in ALLOWED_KEYS if key in video}
    for key in ('title','cat','date','desc','type','url','thumb'):
        value = item.get(key, '')
        item[key] = str(value)[:500 if key == 'desc' else 240] if value is not None else ''
    item['url'] = safe_url(item.get('url'))
    item['thumb'] = safe_url(item.get('thumb'))
    if item['title'] and item['url'] and item['type'] in ('mp4','youtube'):
        clean.append(item)

if not clean:
    raise ValueError('no validated published TV videos')

payload = {
    'source':'public-catalogue-snapshot',
    'generatedAtUtc':datetime.now(timezone.utc).isoformat(timespec='seconds'),
    'videos':clean,
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('TV snapshot ready:', len(clean), 'videos,', OUT.stat().st_size, 'bytes')
