#!/usr/bin/env python3
"""Finalize 4.37 by removing lock contention between Social preload and first entry."""
from pathlib import Path
import hashlib
import json

root=Path('android437')
main=root/'app/src/main/java/com/marketmarney/mobile/MainActivity.java'
text=main.read_text(encoding='utf-8')

old_ensure='''    private void ensureSocialAssets(){
        if(socialAssetsReady)return;
        synchronized(socialAssetLock){
            if(socialAssetsReady)return;
            socialCss=asset("social44.css")+"\\n"+asset("reels46.css")+"\\n"+asset("navigation47.css")+"\\n"+asset("premium411.css");
            socialScript=asset("profile49.js")+"\\n"+asset("social44.js")+"\\n"+asset("reels46.js")+"\\n"+asset("navigation47.js");
            socialCssQuoted=JSONObject.quote(socialCss);socialAssetsReady=true;
        }
    }
'''
new_ensure='''    private void ensureSocialAssets(){
        if(socialAssetsReady)return;
        // Asset I/O stays outside the lock. A first Social entry never waits for
        // a background preload that happens to be reading the same files.
        String css=asset("social44.css")+"\\n"+asset("reels46.css")+"\\n"+asset("navigation47.css")+"\\n"+asset("premium411.css");
        String script=asset("profile49.js")+"\\n"+asset("social44.js")+"\\n"+asset("reels46.js")+"\\n"+asset("navigation47.js");
        String quoted=JSONObject.quote(css);
        synchronized(socialAssetLock){
            if(socialAssetsReady)return;
            socialCss=css;socialScript=script;socialCssQuoted=quoted;socialAssetsReady=true;
        }
    }
'''
old_preload='        if(!socialAssetsReady)frame.postDelayed(this::preloadSocialAssets,650);'
new_preload='        if(tab!=SOCIAL&&!socialAssetsReady)frame.postDelayed(this::preloadSocialAssets,650);'
old_nav='tab=selected;reelsChrome=tab==SOCIAL&&cached!=null&&cached.getUrl()!=null&&cached.getUrl().endsWith("#mm44-reels");chromeLight=true;updateSocialChrome();drawTabs();'
new_nav='tab=selected;if(tab==SOCIAL)ensureSocialAssets();reelsChrome=tab==SOCIAL&&cached!=null&&cached.getUrl()!=null&&cached.getUrl().endsWith("#mm44-reels");chromeLight=true;updateSocialChrome();drawTabs();'

for old,new,name in [(old_ensure,new_ensure,'ensureSocialAssets'),(old_preload,new_preload,'page preload'),(old_nav,new_nav,'Social navigation')]:
    count=text.count(old)
    assert count==1,f'{name}: expected one anchor, found {count}'
    text=text.replace(old,new,1)
main.write_text(text,encoding='utf-8')

manifest_path=Path('verified437.json')
manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
digest=hashlib.sha256(main.read_bytes()).hexdigest()
updated=False
for entry in manifest['changed']:
    if entry['path']=='app/src/main/java/com/marketmarney/mobile/MainActivity.java':
        entry['afterSha256']=digest;updated=True;break
assert updated,'MainActivity entry missing from verified437.json'
manifest['purpose']+=' Social asset I/O is performed outside its publication lock so first entry cannot be blocked by background preload.'
manifest_path.write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print('Finalized 4.37 Social asset loading without preload lock contention:',digest)
