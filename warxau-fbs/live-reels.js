/* MarketMarney Live in Reels v1 — public, viewer-only integration. */
(function(){
  'use strict';
  if(window.__mmReelsLiveV1)return;
  window.__mmReelsLiveV1=true;
  const API='/api/live/streams',PANEL='#shReelsPanel',FEED='#shReelFeed';
  const REFRESH_MS=25000;
  const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const liveRootId='mmReelsLiveList',fabId='mmReelsLiveFab';
  let current=[],request=null,poll=null,dialog=null,previousFocus=null,scheduled=false,observed=false;
  let lastChecked=0,requestSeq=0;
  const q=s=>document.querySelector(s);
  function reelsMode(){
    const h=String(location.hash||'').toLowerCase();
    return h.includes('reels')||h.includes('reel')||
      document.documentElement.hasAttribute('data-mm46-reels')||
      document.body&&document.body.hasAttribute('data-mm46-reels');
  }
  function panelVisible(){
    const panel=q(PANEL);
    return !!(panel&&(panel.open||reelsMode()));
  }
  function canPoll(){
    return document.visibilityState!=='hidden'&&!!q(FEED)&&panelVisible();
  }
  function el(tag,cl,text){
    const node=document.createElement(tag);
    if(cl)node.className=cl;
    if(text!=null)node.textContent=String(text);
    return node;
  }
  function ensure(){
    const feed=q(FEED);
    if(!feed||!feed.parentNode)return;
    let root=document.getElementById(liveRootId);
    if(!root){
      root=el('section','mm-reels-live',null);
      root.id=liveRootId;
      root.setAttribute('aria-label','Siaran langsung di Reels');
      const top=el('div','mm-reels-live-top',null);
      const heading=el('div','mm-reels-live-title',null);
      const dot=el('span','mm-reels-live-dot',null);
      dot.setAttribute('aria-hidden','true');
      heading.append(dot,el('strong','', 'LIVE Sekarang'));
      const more=el('a','mm-reels-live-all','Lihat semua Live');
      more.href='/live.html';
      top.append(heading,more);
      const status=el('p','mm-reels-live-message','Memeriksa siaran yang aktif…');
      status.id='mmReelsLiveStatus';
      status.setAttribute('role','status');
      const cards=el('div','mm-reels-live-cards',null);
      cards.id='mmReelsLiveCards';
      cards.setAttribute('aria-label','Daftar streamer aktif');
      root.append(top,status,cards);
    }
    if(root.parentNode!==feed.parentNode||root.nextSibling!==feed)
      feed.parentNode.insertBefore(root,feed);
    if(!observed){
      observed=true;
      const panel=q(PANEL);
      if(panel)panel.addEventListener('toggle',()=>{if(panel.open)refresh(true);else syncFab();});
    }
    syncFab();
  }
  function validStreams(value){
    if(!Array.isArray(value))throw Error('Invalid live stream list');
    return value.filter(x=>x&&typeof x==='object'&&ID.test(String(x.id||'')))
      .slice(0,20).map(x=>({
        id:x.id,
        title:String(x.title||'Siaran Live Marney').slice(0,100),
        host:String(x.hostName||'Trader Marney').slice(0,60),
        category:String(x.category||'Live').slice(0,45),
        viewers:Number.isFinite(Number(x.viewerCount))?Math.max(0,Math.floor(Number(x.viewerCount))):0
      }));
  }
  function card(stream){
    const item=el('button','mm-reels-live-card',null);
    item.type='button';
    item.setAttribute('aria-label','Tonton LIVE '+stream.title+' dari '+stream.host);
    const avatar=el('div','mm-reels-live-avatar',null);
    avatar.append(el('span','mm-reels-live-avatar-letter',stream.host.slice(0,1).toUpperCase()||'M'));
    avatar.append(el('span','mm-reels-live-avatar-label','LIVE'));
    const info=el('span','mm-reels-live-info',null);
    info.append(el('strong','mm-reels-live-stream-title',stream.title));
    info.append(el('small','mm-reels-live-host',stream.host+' · '+stream.category));
    info.append(el('small','mm-reels-live-viewers',stream.viewers+' menonton'));
    item.append(avatar,info);
    item.addEventListener('click',()=>openViewer(stream));
    return item;
  }
  function populate(target){
    if(!target)return;
    target.replaceChildren();
    for(const stream of current)target.appendChild(card(stream));
  }
  function syncFab(){
    let fab=document.getElementById(fabId);
    const active=reelsMode()&&current.length>0;
    if(!active){
      if(fab&&!fab.hidden)fab.hidden=true;
      return;
    }
    if(!fab){
      fab=el('button','mm-reels-live-fab',null);
      fab.id=fabId;fab.type='button';
      fab.addEventListener('click',openChooser);
      document.body.appendChild(fab);
    }
    if(fab.hidden)fab.hidden=false;
    if(fab.dataset.liveCount!==String(current.length)){
      fab.dataset.liveCount=String(current.length);
      fab.replaceChildren(el('span','mm-reels-live-dot',null),document.createTextNode('LIVE · '+current.length));
      fab.setAttribute('aria-label','Lihat '+current.length+' streamer LIVE di Reels');
    }
  }
  function render(){
    ensure();
    const status=document.getElementById('mmReelsLiveStatus');
    const box=document.getElementById('mmReelsLiveCards');
    if(!status||!box)return;
    if(current.length){
      status.hidden=true;
      populate(box);
    }else{
      box.replaceChildren();
      status.hidden=false;
      status.textContent='Belum ada streamer yang sedang LIVE.';
    }
    syncFab();
  }
  async function refresh(force){
    ensure();
    if(!canPoll())return;
    if(request)return;
    if(!force&&Date.now()-lastChecked<REFRESH_MS-2000)return;
    const my=++requestSeq;
    lastChecked=Date.now();
    request=new AbortController();
    const ctl=request;
    const timeout=setTimeout(()=>ctl.abort(),8000);
    try{
      const response=await fetch(API,{
        method:'GET',credentials:'same-origin',cache:'no-store',
        headers:{Accept:'application/json'},signal:ctl.signal
      });
      if(!response.ok)throw Error('HTTP '+response.status);
      const data=await response.json();
      if(my!==requestSeq)return;
      current=validStreams(data.streams);
      render();
    }catch(error){
      if(my!==requestSeq)return;
      // No stale "LIVE" badges when the server cannot confirm a stream.
      current=[];
      render();
      const status=document.getElementById('mmReelsLiveStatus');
      if(status)status.textContent='Siaran belum bisa diperiksa. Coba lagi setelah koneksi pulih.';
    }finally{
      clearTimeout(timeout);
      if(request===ctl)request=null;
    }
  }
  function closeViewer(){
    if(!dialog)return;
    const old=dialog;
    dialog=null;
    old.remove(); // destroys the iframe, closes WebRTC and viewer token
    document.body.classList.remove('mm-reels-live-watching');
    document.removeEventListener('keydown',onKey);
    if(previousFocus&&previousFocus.isConnected)previousFocus.focus({preventScroll:true});
    previousFocus=null;
    refresh(true);
  }
  function onKey(event){if(event.key==='Escape'&&dialog){event.preventDefault();closeViewer();}}
  function wrapModal(titleText){
    if(dialog)closeViewer();
    previousFocus=document.activeElement;
    dialog=el('div','mm-reels-live-dialog',null);
    dialog.setAttribute('role','dialog');
    dialog.setAttribute('aria-modal','true');
    dialog.setAttribute('aria-label',titleText);
    const top=el('div','mm-reels-live-dialog-top',null);
    const back=el('button','mm-reels-live-close','✕  Kembali ke Reels');
    back.type='button';back.addEventListener('click',closeViewer);
    top.append(back,el('strong','mm-reels-live-dialog-title',titleText));
    dialog.appendChild(top);
    document.body.appendChild(dialog);
    document.body.classList.add('mm-reels-live-watching');
    document.addEventListener('keydown',onKey);
    back.focus({preventScroll:true});
    // Do not play simultaneous Reels and Live audio.
    const feed=q(FEED);
    if(feed)feed.querySelectorAll('video').forEach(v=>{try{v.pause();}catch{}});
    return dialog;
  }
  function openViewer(stream){
    const modal=wrapModal('LIVE: '+stream.title);
    const frame=document.createElement('iframe');
    frame.className='mm-reels-live-frame';
    frame.title='Siaran langsung '+stream.title;
    frame.src='/live.html?watch='+encodeURIComponent(stream.id)+'&embed=reels';
    frame.allow='autoplay; fullscreen; picture-in-picture';
    frame.referrerPolicy='same-origin';
    modal.appendChild(frame);
  }
  function openChooser(){
    const modal=wrapModal('Streamer sedang LIVE');
    const list=el('div','mm-reels-live-picker',null);
    populate(list);modal.appendChild(list);
  }
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    (window.requestAnimationFrame||window.setTimeout)(()=>{
      scheduled=false;
      ensure();
      if(canPoll())refresh(false);else syncFab();
    },16);
  }
  function init(){
    if(!document.body)return;
    ensure();
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='hidden'){
        if(request)request.abort();
        if(dialog)closeViewer();
      }else refresh(true);
    });
    window.addEventListener('hashchange',()=>{
      if(dialog&&!reelsMode())closeViewer();
      schedule();
    });
    window.addEventListener('pagehide',()=>{if(request)request.abort();if(dialog)closeViewer();});
    document.addEventListener('click',event=>{
      if(event.target&&event.target.closest&&event.target.closest('a[href*="reel"],button[data-reels]'))
        setTimeout(()=>refresh(true),200);
    },true);
    const observer=new MutationObserver(schedule);
    observer.observe(document.body,{childList:true,subtree:true});
    poll=setInterval(()=>{if(canPoll())refresh(false);else syncFab()},REFRESH_MS);
    schedule();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();