#!/usr/bin/env python3
"""Strengthen the 4.34 Reels controller for lifecycle, network and memory pressure."""
from pathlib import Path

OLD_DECL="""var reduce=matchMedia('(prefers-reduced-motion: reduce)'), conn=navigator.connection||{}, cards=[], states=new WeakMap(), active=null, suspended=!!window.__mm45Suspended, disposed=false, scheduled=false, muted=true, memoryGb=Number(navigator.deviceMemory||4), networkType=String(conn.effectiveType||'').toLowerCase();
var conservative=!!conn.saveData;
try{var savedMode=localStorage.getItem('mm46-data-saver');if(savedMode==='1')conservative=true;else if(savedMode==='0')conservative=false;}catch(ignore){}
var fastNetwork=!conservative&&!/^(slow-)?2g$/.test(networkType),releaseDelay=1100;"""
NEW_DECL="""var reduce=matchMedia('(prefers-reduced-motion: reduce)'), conn=navigator.connection||{}, cards=[], states=new WeakMap(), active=null, suspended=!!window.__mm45Suspended, disposed=false, scheduled=false, muted=true, memoryGb=Number(navigator.deviceMemory||4), networkType=String(conn.effectiveType||'').toLowerCase(), networkOnline=navigator.onLine!==false, pressure=0, resumeTimer=0;
var conservative=!!conn.saveData;
try{var savedMode=localStorage.getItem('mm46-data-saver');if(savedMode==='1')conservative=true;else if(savedMode==='0')conservative=false;}catch(ignore){}
var fastNetwork=networkOnline&&!conservative&&!/^(slow-)?2g$/.test(networkType),releaseDelay=1100;"""

OLD_SAVER="saver.addEventListener('change',function(){conservative=saver.checked;fastNetwork=!conservative&&!/^(slow-)?2g$/.test(networkType);try{localStorage.setItem('mm46-data-saver',conservative?'1':'0');}catch(ignore){}budget();});"
NEW_SAVER="saver.addEventListener('change',function(){conservative=saver.checked;fastNetwork=networkOnline&&!conservative&&!/^(slow-)?2g$/.test(networkType);try{localStorage.setItem('mm46-data-saver',conservative?'1':'0');}catch(ignore){}budget();});"

OLD_RELEASE="function release(st){if(!st)return;cancelRelease(st);st.v.pause();clearTimeout(st.waitTimer);st.card.removeAttribute('data-mm46-loading');if(st.v.hasAttribute('src')){st.position=Number.isFinite(st.v.currentTime)?st.v.currentTime:0;st.v.removeAttribute('src');st.v.load();}delete st.v.dataset.mm46Attached;}"
NEW_RELEASE="function release(st){if(!st)return;cancelRelease(st);st.playToken++;st.playPending=false;st.v.pause();clearTimeout(st.waitTimer);st.card.removeAttribute('data-mm46-loading');if(st.v.hasAttribute('src')){st.position=Number.isFinite(st.v.currentTime)?st.v.currentTime:0;st.v.removeAttribute('src');st.v.load();}delete st.v.dataset.mm46Attached;}"

OLD_PAUSE="function pauseAll(){cards.forEach(function(c){var st=states.get(c);if(st&&!st.v.paused)st.v.pause();});}"
NEW_PAUSE="function pauseAll(){cards.forEach(function(c){var st=states.get(c);if(!st)return;st.playToken++;st.playPending=false;if(!st.v.paused)st.v.pause();});}"

OLD_BUDGET="function budget(){var i=cards.indexOf(active),keepAhead=fastNetwork&&memoryGb>=4?2:1;cards.forEach(function(c,n){var st=states.get(c);if(!st)return;if(i<0){scheduleRelease(st,300);return;}if(!isReels()||suspended||document.hidden){if(c===active){st.v.pause();attach(st,'metadata','low');}else scheduleRelease(st,300);return;}var distance=n-i;if(distance===0)attach(st,'auto','high');else if(distance===1)attach(st,fastNetwork?'auto':'metadata',fastNetwork?'high':'low');else if(distance===-1)attach(st,'metadata','low');else if(distance>1&&distance<=keepAhead)attach(st,'metadata','low');else scheduleRelease(st,releaseDelay);});}"
NEW_BUDGET="function budget(){var i=cards.indexOf(active),keepAhead=pressure>=10?0:(fastNetwork&&memoryGb>=4?2:1);cards.forEach(function(c,n){var st=states.get(c);if(!st)return;if(i<0){scheduleRelease(st,300);return;}if(!networkOnline){if(c===active)attach(st,'metadata','low');else scheduleRelease(st,200);return;}if(!isReels()||suspended||document.hidden){if(c===active){st.v.pause();attach(st,'metadata','low');}else scheduleRelease(st,300);return;}var distance=n-i;if(distance===0)attach(st,'auto','high');else if(distance===1)attach(st,fastNetwork?'auto':'metadata',fastNetwork?'high':'low');else if(distance===-1)attach(st,'metadata','low');else if(distance>1&&distance<=keepAhead)attach(st,'metadata','low');else scheduleRelease(st,releaseDelay);});}"

OLD_START="function start(st,user){if(!st||!mayPlay())return;if(!user&&(conservative||reduce.matches||st.userPaused))return;cards.forEach(function(c){var x=states.get(c);if(x&&x!==st)x.v.pause();});attach(st,'auto','high');st.v.muted=muted;st.card.removeAttribute('data-mm46-error');st.card.removeAttribute('data-mm433-slow');st.v.play().then(function(){if(active!==st.card||!mayPlay())st.v.pause();else{st.userPaused=false;st.card.removeAttribute('data-mm46-blocked');budget();}}).catch(function(){st.card.dataset.mm46Blocked='1';st.v.pause();});}"
NEW_START="function start(st,user){if(!st||!mayPlay()||!networkOnline)return;if(!user&&(conservative||reduce.matches||st.userPaused))return;if(st.playPending)return;cards.forEach(function(c){var x=states.get(c);if(x&&x!==st){x.playToken++;x.playPending=false;x.v.pause();}});attach(st,'auto','high');st.v.muted=muted;st.card.removeAttribute('data-mm46-error');st.card.removeAttribute('data-mm433-slow');st.playPending=true;var token=++st.playToken,attempt=st.v.play();if(!attempt||typeof attempt.then!=='function'){st.playPending=false;return;}attempt.then(function(){if(token!==st.playToken)return;st.playPending=false;if(active!==st.card||!mayPlay()||!networkOnline)st.v.pause();else{st.userPaused=false;st.card.removeAttribute('data-mm46-blocked');budget();}}).catch(function(){if(token!==st.playToken)return;st.playPending=false;st.card.dataset.mm46Blocked='1';st.v.pause();});}"

OLD_STATE="var st={card:card,v:v,source:source,position:0,userPaused:false,waitTimer:0,releaseTimer:0};"
NEW_STATE="var st={card:card,v:v,source:source,position:0,userPaused:false,waitTimer:0,releaseTimer:0,playToken:0,playPending:false};"

OLD_PLAYING="v.addEventListener('playing',function(){clearTimeout(st.waitTimer);card.removeAttribute('data-mm46-loading');card.removeAttribute('data-mm433-slow');card.dataset.mm46Playing='1';budget();});"
NEW_PLAYING="v.addEventListener('playing',function(){clearTimeout(st.waitTimer);card.removeAttribute('data-mm46-loading');card.removeAttribute('data-mm433-slow');card.dataset.mm46Playing='1';if(typeof v.requestVideoFrameCallback==='function')v.requestVideoFrameCallback(function(){card.dataset.mm435Frame='1';});else card.dataset.mm435Frame='1';budget();});"

OLD_SUSPEND="function onSuspend(){suspended=true;pauseAll();budget();}\nfunction onResume(){suspended=false;refreshMode();}"
NEW_SUSPEND="function onSuspend(){suspended=true;pressure=Math.max(pressure,10);pauseAll();budget();}\nfunction onResume(){suspended=false;clearTimeout(resumeTimer);resumeTimer=setTimeout(function(){pressure=0;refreshMode();},80);}"

OLD_CONNECTION="function connectionChanged(){networkType=String(conn.effectiveType||'').toLowerCase();fastNetwork=!conservative&&!/^(slow-)?2g$/.test(networkType);budget();}"
NEW_CONNECTION="function connectionChanged(){networkType=String(conn.effectiveType||'').toLowerCase();fastNetwork=networkOnline&&!conservative&&!/^(slow-)?2g$/.test(networkType);budget();}\nfunction networkChanged(){networkOnline=navigator.onLine!==false;fastNetwork=networkOnline&&!conservative&&!/^(slow-)?2g$/.test(networkType);if(!networkOnline)pauseAll();budget();if(networkOnline&&active&&!blocked())start(states.get(active),false);}\nfunction memoryChanged(event){var level=event&&event.detail&&Number(event.detail.level);pressure=Number.isFinite(level)?level:0;budget();}\nfunction foregroundChanged(){onResume();}\nfunction backgroundChanged(){onSuspend();}"

OLD_EVENTS="feed.addEventListener('scroll',scrollFallback,{passive:true});window.addEventListener('mm45:suspend',onSuspend);window.addEventListener('mm45:resume',onResume);document.addEventListener('visibilitychange',visibility);document.addEventListener('keydown',keys);window.addEventListener('resize',dimensions);if(window.visualViewport)window.visualViewport.addEventListener('resize',dimensions);if(conn&&conn.addEventListener)conn.addEventListener('change',connectionChanged);"
NEW_EVENTS="feed.addEventListener('scroll',scrollFallback,{passive:true});window.addEventListener('mm45:suspend',onSuspend);window.addEventListener('mm45:resume',onResume);window.addEventListener('mmapp:memory',memoryChanged);window.addEventListener('mmapp:foreground',foregroundChanged);window.addEventListener('mmapp:background',backgroundChanged);window.addEventListener('online',networkChanged);window.addEventListener('offline',networkChanged);window.addEventListener('mm435:network',networkChanged);document.addEventListener('visibilitychange',visibility);document.addEventListener('keydown',keys);window.addEventListener('resize',dimensions);if(window.visualViewport)window.visualViewport.addEventListener('resize',dimensions);if(conn&&conn.addEventListener)conn.addEventListener('change',connectionChanged);"

OLD_DESTROY="function destroy(){disposed=true;pauseAll();cards.forEach(function(c){release(states.get(c));});feedObserver.disconnect();modeObserver.disconnect();dialogObserver.disconnect();if(intersection)intersection.disconnect();clearTimeout(scrollTimer);window.removeEventListener('mm45:suspend',onSuspend);window.removeEventListener('mm45:resume',onResume);document.removeEventListener('visibilitychange',visibility);document.removeEventListener('keydown',keys);window.removeEventListener('resize',dimensions);if(window.visualViewport)window.visualViewport.removeEventListener('resize',dimensions);if(conn&&conn.removeEventListener)conn.removeEventListener('change',connectionChanged);}"
NEW_DESTROY="function destroy(){disposed=true;clearTimeout(resumeTimer);pauseAll();cards.forEach(function(c){release(states.get(c));});feedObserver.disconnect();modeObserver.disconnect();dialogObserver.disconnect();if(intersection)intersection.disconnect();clearTimeout(scrollTimer);window.removeEventListener('mm45:suspend',onSuspend);window.removeEventListener('mm45:resume',onResume);window.removeEventListener('mmapp:memory',memoryChanged);window.removeEventListener('mmapp:foreground',foregroundChanged);window.removeEventListener('mmapp:background',backgroundChanged);window.removeEventListener('online',networkChanged);window.removeEventListener('offline',networkChanged);window.removeEventListener('mm435:network',networkChanged);document.removeEventListener('visibilitychange',visibility);document.removeEventListener('keydown',keys);window.removeEventListener('resize',dimensions);if(window.visualViewport)window.visualViewport.removeEventListener('resize',dimensions);if(conn&&conn.removeEventListener)conn.removeEventListener('change',connectionChanged);}"

REPLACEMENTS=[
 (OLD_DECL,NEW_DECL),(OLD_SAVER,NEW_SAVER),(OLD_RELEASE,NEW_RELEASE),(OLD_PAUSE,NEW_PAUSE),
 (OLD_BUDGET,NEW_BUDGET),(OLD_START,NEW_START),(OLD_STATE,NEW_STATE),(OLD_PLAYING,NEW_PLAYING),
 (OLD_SUSPEND,NEW_SUSPEND),(OLD_CONNECTION,NEW_CONNECTION),(OLD_EVENTS,NEW_EVENTS),(OLD_DESTROY,NEW_DESTROY),
]

def patch_controller(path:Path)->None:
    text=path.read_text(encoding='utf-8')
    for old,new in REPLACEMENTS:
        count=text.count(old)
        assert count==1,f'{path}: expected one 4.34 anchor, found {count}: {old[:100]!r}'
        text=text.replace(old,new,1)
    path.write_text(text,encoding='utf-8')
