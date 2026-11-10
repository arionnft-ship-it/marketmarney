#!/usr/bin/env python3
"""Align inherited 4.34/4.35 assertions with the stricter 4.36 policy and refresh the verified manifest."""
from pathlib import Path
import hashlib
import json

root=Path('android436')
manifest_path=Path('verified436.json')
manifest=json.loads(manifest_path.read_text(encoding='utf-8'))

def sha(path:Path)->str:return hashlib.sha256(path.read_bytes()).hexdigest()

def patch(rel:str,old:str,new:str)->None:
    path=root/rel;text=path.read_text(encoding='utf-8')
    assert text.count(old)==1,(rel,old)
    before=sha(path);path.write_text(text.replace(old,new,1),encoding='utf-8');after=sha(path)
    entry=next((item for item in manifest['changed'] if item['path']==rel),None)
    if entry is not None:
        assert entry['afterSha256']==before,rel
        entry['afterSha256']=after
    else:
        preserved=manifest['preserved'].pop(rel)
        assert preserved==before,rel
        manifest['changed'].append({'path':rel,'beforeSha256':before,'afterSha256':after})

patch(
 'app/src/androidTest/java/com/marketmarney/mobile/Reels434PerformanceTest.java',
 'assertTrue(script.contains("keepAhead=pressure>=10?0:(fastNetwork&&memoryGb>=4?2:1)"));',
 'assertTrue(script.contains("keepAhead=pressure>=10||powerSaving?0:(fastNetwork&&memoryGb>=4?2:1)"));'
)
patch(
 'app/src/androidTest/java/com/marketmarney/mobile/Performance435Test.java',
 'assertTrue(name,script.contains("pressure>=10?0"));',
 'assertTrue(name,script.contains("pressure>=10||powerSaving?0"));'
)
manifest['changed']=sorted(manifest['changed'],key=lambda item:item['path'])
manifest_path.write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print('Aligned inherited Reels assertions for MarketMarney 4.36.')
