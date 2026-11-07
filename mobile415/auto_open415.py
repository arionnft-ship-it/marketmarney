"""Called by prepare415: keep the forms, open chooser in the explicit upload click gesture."""
from pathlib import Path
import json,subprocess
assets=base/'app/src/main/assets'
changes={
 "action('Buat Story','plus',function(){if(!logged()){login();return;}setView('feed');if($('shStoryCreate'))$('shStoryCreate').showModal();});":
 "action('Buat Story','plus',function(){if(!logged()){login();return;}setView('feed');if($('shStoryCreate')){$('shStoryCreate').showModal();if($('shStoryFile'))$('shStoryFile').click();}});",
 "action('Unggah Reel','reels',function(){if(!logged()){login();return;}setView('reels');H.dataset.mm44ReelCompose='1';if($('shReelCaption'))$('shReelCaption').focus();});":
 "action('Unggah Reel','reels',function(){if(!logged()){login();return;}setView('reels');H.dataset.mm44ReelCompose='1';if($('shReelVideo'))$('shReelVideo').click();});"
}
report={}
for name in ['social44.js','social411/app.js']:
 p=assets/name;s=p.read_text();old=hashlib.sha256(p.read_bytes()).hexdigest()
 for a,b in changes.items():
  assert s.count(a)==1,(name,a)
  s=s.replace(a,b,1)
 p.write_text(s);report[name]={'before':old,'after':hashlib.sha256(p.read_bytes()).hexdigest()}
 preserved.pop(str(p.relative_to(base)))
 subprocess.run(['node','--check',str(p)],check=True)
# Execute exact two handlers with logged-in / logged-out DOM doubles. No API or user files.
for body in changes.values():
 body=body.split('function(){',1)[1].rsplit('});',1)[0]
 script="""const assert=require('node:assert/strict');let clicks=0,logins=0;let yes=true;
 const elements=new Map();const $=id=>{if(!elements.has(id))elements.set(id,{click(){clicks++},showModal(){},focus(){}});return elements.get(id)};
 const H={dataset:{}};const logged=()=>yes;const login=()=>logins++;const setView=()=>{};
 const run=()=>{BODY};run();assert.equal(clicks,1);yes=false;run();assert.equal(clicks,1);assert.equal(logins,1);
 console.log('PASS: explicit upload opens one picker; guest goes to login');
 """.replace('BODY',body)
 subprocess.run(['node','-e',script],check=True)
Path('gallery-actions415.json').write_text(json.dumps({'changed':report,'handler_assertions':4,'api_writes':False},indent=2))
