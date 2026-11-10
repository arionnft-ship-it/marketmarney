#!/usr/bin/env python3
"""Add bounded, position-preserving Reel recovery to the 4.36 controller."""
from pathlib import Path

OLD_STATE="var st={card:card,v:v,source:source,position:0,userPaused:false,waitTimer:0,releaseTimer:0,playToken:0,playPending:false};"
NEW_STATE="var st={card:card,v:v,source:source,position:0,userPaused:false,waitTimer:0,releaseTimer:0,playToken:0,playPending:false,stallTimer:0,lastProgressTime:0,recoveryCount:0,lastRecoveryAt:0,recovering:false};"

OLD_RELEASE="function release(st){if(!st)return;cancelRelease(st);st.playToken++;st.playPending=false;st.v.pause();clearTimeout(st.waitTimer);st.card.removeAttribute('data-mm46-loading');if(st.v.hasAttribute('src')){st.position=Number.isFinite(st.v.currentTime)?st.v.currentTime:0;st.v.removeAttribute('src');st.v.load();}delete st.v.dataset.mm46Attached;}"
NEW_RELEASE="function release(st){if(!st)return;cancelRelease(st);clearStall(st);st.playToken++;st.playPending=false;st.v.pause();clearTimeout(st.waitTimer);st.card.removeAttribute('data-mm46-loading');if(st.v.hasAttribute('src')){st.position=Number.isFinite(st.v.currentTime)?st.v.currentTime:0;st.v.removeAttribute('src');st.v.load();}delete st.v.dataset.mm46Attached;}"

START_ANCHOR="function start(st,user){"
RECOVERY_FUNCTIONS="""function clearStall(st){if(!st)return;clearTimeout(st.stallTimer);st.stallTimer=0;st.recovering=false;st.card.removeAttribute('data-mm437-recovering');st.card.removeAttribute('data-mm437-slow');}
function recoverStall(st){if(!st||active!==st.card||st.v.paused||blocked()||!networkOnline||!networkValidated)return;var now=Date.now();clearStall(st);if(st.recoveryCount>=2||now-st.lastRecoveryAt<18000){st.card.dataset.mm437Slow='1';return;}st.recoveryCount++;st.lastRecoveryAt=now;st.userPaused=false;st.position=Number.isFinite(st.v.currentTime)?st.v.currentTime:0;st.playToken++;st.playPending=false;st.recovering=true;st.card.dataset.mm437Recovering='1';attach(st,'auto','high');var token=st.playToken;var resume=function(){if(token!==st.playToken||active!==st.card||blocked()||!networkOnline||!networkValidated)return;clearStall(st);start(st,true);};st.v.addEventListener('loadedmetadata',resume,{once:true});try{st.v.pause();st.v.load();}catch(ignore){clearStall(st);st.card.dataset.mm437Slow='1';return;}st.stallTimer=setTimeout(function(){st.stallTimer=0;if(st.recovering){st.recovering=false;st.card.removeAttribute('data-mm437-recovering');st.card.dataset.mm437Slow='1';}},8000);}
function scheduleStall(st){if(!st||st.recovering)return;clearTimeout(st.stallTimer);var observed=Number.isFinite(st.v.currentTime)?st.v.currentTime:0;var delay=conservative||networkMetered||powerSaving?6500:4200;st.stallTimer=setTimeout(function(){st.stallTimer=0;if(active!==st.card||st.v.paused||blocked()||!networkOnline||!networkValidated)return;var current=Number.isFinite(st.v.currentTime)?st.v.currentTime:0;if(current>observed+.15)return;recoverStall(st);},delay);}
"""

OLD_START_MARK="st.card.removeAttribute('data-mm433-slow');st.playPending=true;"
NEW_START_MARK="st.card.removeAttribute('data-mm433-slow');st.card.removeAttribute('data-mm437-slow');st.card.removeAttribute('data-mm437-recovering');st.playPending=true;"

OLD_RETRY="var retry=button('Coba putar ulang video','retry',function(e){e.stopPropagation();st.userPaused=false;v.load();start(st,true);},'mm46-retry');"
NEW_RETRY="var retry=button('Coba putar ulang video','retry',function(e){e.stopPropagation();clearStall(st);st.recoveryCount=0;st.lastRecoveryAt=0;st.userPaused=false;v.load();start(st,true);},'mm46-retry');"

OLD_PLAYING="v.addEventListener('playing',function(){clearTimeout(st.waitTimer);card.removeAttribute('data-mm46-loading');card.removeAttribute('data-mm433-slow');card.dataset.mm46Playing='1';if(typeof v.requestVideoFrameCallback==='function')v.requestVideoFrameCallback(function(){card.dataset.mm435Frame='1';});else card.dataset.mm435Frame='1';budget();});"
NEW_PLAYING="v.addEventListener('playing',function(){clearTimeout(st.waitTimer);clearStall(st);card.removeAttribute('data-mm46-loading');card.removeAttribute('data-mm433-slow');card.dataset.mm46Playing='1';if(typeof v.requestVideoFrameCallback==='function')v.requestVideoFrameCallback(function(){card.dataset.mm435Frame='1';});else card.dataset.mm435Frame='1';budget();});"

OLD_PAUSE="v.addEventListener('pause',function(){card.removeAttribute('data-mm46-playing');clearTimeout(st.waitTimer);card.removeAttribute('data-mm46-loading');});"
NEW_PAUSE="v.addEventListener('pause',function(){card.removeAttribute('data-mm46-playing');clearTimeout(st.waitTimer);card.removeAttribute('data-mm46-loading');if(!st.recovering)clearStall(st);});"

OLD_WAITING="v.addEventListener('waiting',function(){clearTimeout(st.waitTimer);st.waitTimer=setTimeout(function(){if(active===card&&!v.paused&&!blocked())card.dataset.mm46Loading='1';},240);});"
NEW_WAITING="v.addEventListener('waiting',function(){clearTimeout(st.waitTimer);st.waitTimer=setTimeout(function(){if(active===card&&!v.paused&&!blocked())card.dataset.mm46Loading='1';},240);scheduleStall(st);});\n v.addEventListener('stalled',function(){scheduleStall(st);});"

OLD_TIMEUPDATE="v.addEventListener('timeupdate',function(){if(active!==card||!Number.isFinite(v.duration)||v.duration<=0)return;seeker.value=String(Math.round(1000*v.currentTime/v.duration));seeker.setAttribute('aria-valuetext',Math.floor(v.currentTime)+' dari '+Math.floor(v.duration)+' detik');});"
NEW_TIMEUPDATE="v.addEventListener('timeupdate',function(){clearStall(st);if(Number.isFinite(v.currentTime)&&v.currentTime>st.lastProgressTime+8){st.lastProgressTime=v.currentTime;st.recoveryCount=0;}if(active!==card||!Number.isFinite(v.duration)||v.duration<=0)return;seeker.value=String(Math.round(1000*v.currentTime/v.duration));seeker.setAttribute('aria-valuetext',Math.floor(v.currentTime)+' dari '+Math.floor(v.duration)+' detik');});"

OLD_ERROR="v.addEventListener('error',function(){if(v.hasAttribute('src')){card.dataset.mm46Error='1';clearTimeout(st.waitTimer);card.removeAttribute('data-mm46-loading');}});"
NEW_ERROR="v.addEventListener('error',function(){clearStall(st);if(v.hasAttribute('src')){card.dataset.mm46Error='1';card.dataset.mm437Slow='1';clearTimeout(st.waitTimer);card.removeAttribute('data-mm46-loading');}});"

REPLACEMENTS=[
    (OLD_STATE,NEW_STATE),
    (OLD_RELEASE,NEW_RELEASE),
    (OLD_START_MARK,NEW_START_MARK),
    (OLD_RETRY,NEW_RETRY),
    (OLD_PLAYING,NEW_PLAYING),
    (OLD_PAUSE,NEW_PAUSE),
    (OLD_WAITING,NEW_WAITING),
    (OLD_TIMEUPDATE,NEW_TIMEUPDATE),
    (OLD_ERROR,NEW_ERROR),
]

def patch_controller(path:Path)->None:
    text=path.read_text(encoding='utf-8')
    assert text.count(START_ANCHOR)==1,f'{path}: missing unique start anchor'
    text=text.replace(START_ANCHOR,RECOVERY_FUNCTIONS+START_ANCHOR,1)
    for old,new in REPLACEMENTS:
        count=text.count(old)
        assert count==1,f'{path}: expected one 4.36 anchor, found {count}: {old[:120]!r}'
        text=text.replace(old,new,1)
    path.write_text(text,encoding='utf-8')
