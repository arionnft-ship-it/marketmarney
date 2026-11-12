#!/usr/bin/env python3
"""Produce a public-only, bounded offline TV catalogue for the Android QA build.

Reads the existing published public API; no credentials, admin endpoints,
user records, private storage, upload, or website mutation. Fails closed on
missing videos or malformed responses. The embedded snapshot is a fallback,
and should never be represented as guaranteed current after installation.
"""
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlparse, urljoin
from datetime import datetime, timezone
import json
import sys
import time

OUT = Path(sys.argv[1] if len(sys.argv)>1 else 'android439/app/src/main/assets/marketmarney-tv-catalogue.json')
ENDPOINT = 'https://marketmarney.com/api/content'
ALLOWED_KEYS = ('id','title','cat','date','desc','type','url','thumb','status')
MAX_JSON_BYTES = 2_000_000

def safe_url(url):
    if not isinstance(url,str):return ''
    u=urlparse(urljoin('https://marketmarney.com',url))
    return url if u.scheme=='https' and u.hostname in (
        'marketmarney.com','www.marketmarney.com','youtu.be',
        'youtube.com','www.youtube.com','www.youtube-nocookie.com',
        'i.ytimg.com'
    ) else ''

def get_public():
    req=Request(ENDPOINT, headers={
        'User-Agent':'MarketMarney-Android-TV-Build-Snapshot/1.0',
        'Accept':'application/json','Accept-Encoding':'identity'
    })
    for attempt in range(3):
        try:
            with urlopen(req,timeout=20) as r:
                if r.status!=200 or 'json' not in r.headers.get('Content-Type','').lower():
                    raise ValueError('Public catalogue did not return JSON/HTTP 200')
                raw=r.read(MAX_JSON_BYTES+1)
                if len(raw)>MAX_JSON_BYTES:
                    raise ValueError('Public catalogue exceeds the size cap')
                data=json.loads(raw.decode('utf-8'))
            if not isinstance(data,dict) or not isinstance(data.get('videos'),list):
                raise ValueError('Public API lacks videos array')
            return data['videos']
        except Exception:
            if attempt==2:raise
            time.sleep(2)

videos=get_public()
clean=[]
for video in videos[:200]:
    if not isinstance(video,dict) or video.get('status')!='published':continue
    rec={key:video.get(key) for key in ALLOWED_KEYS if key in video}
    for key in ('title','cat','date','desc','type','url','thumb'):
        value=rec.get(key,'')
        rec[key]=str(value)[:500 if key=='desc' else 240] if value is not None else ''
    rec['url']=safe_url(rec.get('url'))
    rec['thumb']=safe_url(rec.get('thumb'))
    if not rec['title'] or not rec['url'] or rec['type'] not in ('mp4','youtube'):continue
    clean.append(rec)
if not clean:
    raise ValueError('No validated public/published videos in catalogue')
payload={
    'source':'public-catalogue-snapshot',
    'generatedAtUtc':datetime.now(timezone.utc).isoformat(timespec='seconds'),
    'videos':clean
}
OUT.parent.mkdir(parents=True,exist_ok=True)
OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('TV_PUBLIC_SNAPSHOT_READY','videos',len(clean),'types',
      {k:sum(x.get('type')==k for x in clean) for k in ('mp4','youtube')},
      'bytes',OUT.stat().st_size)
