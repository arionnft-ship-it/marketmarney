#!/usr/bin/env python3
"""Finalize 4.38 by removing synchronous Social asset I/O from the Android UI thread."""
from pathlib import Path
import hashlib
import json

root=Path('android438')
main=root/'app/src/main/java/com/marketmarney/mobile/MainActivity.java'
text=main.read_text(encoding='utf-8')

old_preload='''    private void preloadSocialAssets(){
        if(destroyed||socialAssetsReady||lowRamDevice||nativePowerSave)return;
        synchronized(socialAssetLock){
            if(destroyed||socialAssetsReady||socialAssetFuture!=null)return;
            if(socialAssetExecutor==null)socialAssetExecutor=java.util.concurrent.Executors.newSingleThreadExecutor();
            try{
                socialAssetFuture=socialAssetExecutor.submit(()->{
                    try{ensureSocialAssets();}
                    catch(RuntimeException failure){Log.w("MM437_ASSETS","Social assets will retry on demand",failure);}
                    finally{synchronized(socialAssetLock){socialAssetFuture=null;}}
                });
            }catch(java.util.concurrent.RejectedExecutionException ignored){}
        }
    }
'''
new_preload='''    private void preloadSocialAssets(){
        if(destroyed||socialAssetsReady||(tab!=SOCIAL&&(lowRamDevice||nativePowerSave)))return;
        synchronized(socialAssetLock){
            if(destroyed||socialAssetsReady||socialAssetFuture!=null)return;
            if(socialAssetExecutor==null)socialAssetExecutor=java.util.concurrent.Executors.newSingleThreadExecutor();
            try{
                socialAssetFuture=socialAssetExecutor.submit(()->{
                    try{ensureSocialAssets();}
                    catch(RuntimeException failure){Log.w("MM438_ASSETS","Social assets will retry asynchronously",failure);}
                    finally{
                        synchronized(socialAssetLock){socialAssetFuture=null;}
                        if(socialAssetsReady)frame.post(()->{
                            WebView target=web;String current=target==null?null:target.getUrl();
                            if(!destroyed&&target!=null&&tab==SOCIAL&&own(current))adapt(target,current);
                        });
                    }
                });
            }catch(java.util.concurrent.RejectedExecutionException ignored){}
        }
    }
'''
old_nav='tab=selected;if(tab==SOCIAL)ensureSocialAssets();reelsChrome=tab==SOCIAL&&cached!=null&&cached.getUrl()!=null&&cached.getUrl().endsWith("#mm44-reels");chromeLight=true;updateSocialChrome();drawTabs();'
new_nav='tab=selected;if(tab==SOCIAL)preloadSocialAssets();reelsChrome=tab==SOCIAL&&cached!=null&&cached.getUrl()!=null&&cached.getUrl().endsWith("#mm44-reels");chromeLight=true;updateSocialChrome();drawTabs();'
old_adapt='''        boolean social="/beranda-trader.html".equals(path)||"/profil.html".equals(path)||"/grup-trader.html".equals(path);
        if(social)ensureSocialAssets();
'''
new_adapt='''        boolean social="/beranda-trader.html".equals(path)||"/profil.html".equals(path)||"/grup-trader.html".equals(path);
        if(social&&!socialAssetsReady){preloadSocialAssets();return;}
'''

for old,new,name in [
    (old_preload,new_preload,'preloadSocialAssets'),
    (old_nav,new_nav,'Social navigation'),
    (old_adapt,new_adapt,'Social adapt guard'),
]:
    count=text.count(old)
    assert count==1,f'{name}: expected one anchor, found {count}'
    text=text.replace(old,new,1)
main.write_text(text,encoding='utf-8')

manifest_path=Path('verified438.json')
manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
digest=hashlib.sha256(main.read_bytes()).hexdigest()
updated=False
for entry in manifest['changed']:
    if entry['path']=='app/src/main/java/com/marketmarney/mobile/MainActivity.java':
        entry['afterSha256']=digest;updated=True;break
assert updated,'MainActivity entry missing from verified438.json'
manifest['purpose']+=' Direct Social entry now reads and publishes its heavy assets on the existing single background executor, then re-enters document adaptation on the UI thread without blocking WebView callbacks.'
manifest_path.write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print('Finalized 4.38 asynchronous Social entry:',digest)
