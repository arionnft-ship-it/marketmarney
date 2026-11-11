/* Live Marney chat + free virtual gifts, viewer and broadcaster. No purchases. */
(function(){
  'use strict';
  if(window.__mmLiveEngagement)return;
  window.__mmLiveEngagement=true;
  const BASE='/api/live-interactions/streams/';
  const GIFTS=[
    {id:'heart',emoji:'❤️',name:'Hati'},
    {id:'clap',emoji:'👏',name:'Tepuk tangan'},
    {id:'star',emoji:'⭐',name:'Bintang'},
    {id:'flower',emoji:'🌸',name:'Bunga'}
  ];
  let session=null,abort=null,readAbort=null,chatBody=null,chatForm=null,giftsBody=null,badge=null,status=null;
  let lastComments=new Map(),reconnect=0,disposed=false;
  const q=s=>document.querySelector(s);
  function el(tag,cls,content){
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(content!==undefined)node.textContent=content;
    return node;
  }
  function build(){
    for(const panel of ['#hostStage .mm-live-panel','#viewerStage .mm-live-panel']){
      const parent=q(panel);
      if(!parent||parent.querySelector('.mm-live-engagement'))continue;
      const root=el('section','mm-live-engagement');
      root.setAttribute('aria-label','Komentar dan hadiah Live Marney');
      const top=el('div','mm-live-engagement-head');
      top.append(el('strong','', 'Komentar LIVE'));
      const giftNote=el('span','mm-live-gift-disclaimer','Hadiah virtual gratis · tanpa nilai uang');
      top.append(giftNote);
      const list=el('div','mm-live-comments');
      list.setAttribute('role','log');list.setAttribute('aria-live','polite');
      list.setAttribute('aria-relevant','additions text');
      list.append(el('p','mm-live-engagement-empty','Komentar penonton akan muncul di sini.'));
      const form=el('form','mm-live-chat-form');
      const input=el('input','mm-live-chat-input');
      input.type='text';input.placeholder='Tulis komentar…';input.maxLength=180;
      input.autocomplete='off';input.setAttribute('aria-label','Tulis komentar saat LIVE');
      const send=el('button','mm-live-chat-submit','Kirim');send.type='submit';
      form.append(input,send);
      const gifts=el('div','mm-live-gifts');
      for(const gift of GIFTS){
        const button=el('button','mm-live-gift',gift.emoji+' '+gift.name);
        button.type='button';button.dataset.giftId=gift.id;
        button.setAttribute('aria-label','Kirim hadiah virtual gratis '+gift.name);
        button.addEventListener('click',()=>sendGift(gift.id));
        gifts.appendChild(button);
      }
      const liveStatus=el('p','mm-live-engagement-status','Masuk ke siaran untuk berkomentar.');
      liveStatus.setAttribute('role','status');
      root.append(top,list,form,gifts,liveStatus);
      form.addEventListener('submit',event=>{
        event.preventDefault();
        const message=input.value.trim();
        if(!message)return;
        sendMessage(message).then(()=>{input.value='';}).catch(()=>{});
      });
      parent.appendChild(root);
      root.hidden=true;
    }
  }
  function activeRoot(){
    const selector=session?.role==='host'?'#hostStage .mm-live-engagement':'#viewerStage .mm-live-engagement';
    return q(selector);
  }
  function showStatus(message){
    const target=activeRoot()?.querySelector('.mm-live-engagement-status');
    if(target)target.textContent=message;
  }
  function showComment(data){
    const root=activeRoot(),box=root?.querySelector('.mm-live-comments');
    if(!box||!data||!data.id||lastComments.has(data.id))return;
    const empty=box.querySelector('.mm-live-engagement-empty');if(empty)empty.remove();
    const line=el('article','mm-live-comment');
    line.dataset.commentId=data.id;
    const name=el('strong','mm-live-comment-name',data.sender||'Penonton');
    const content=el('span','mm-live-comment-text',data.text||'');
    line.append(name,content);
    if(session?.role==='host'){
      const remove=el('button','mm-live-mod-button','Hapus');
      remove.type='button';remove.setAttribute('aria-label','Hapus komentar '+(data.sender||'Penonton'));
      remove.addEventListener('click',()=>removeComment(data.id));
      line.appendChild(remove);
    }else{
      const report=el('button','mm-live-report-button','Laporkan');
      report.type='button';
      report.addEventListener('click',()=>reportComment(data.id));
      line.appendChild(report);
    }
    box.appendChild(line);lastComments.set(data.id,line);
    while(lastComments.size>60){
      const oldest=lastComments.keys().next().value;
      lastComments.get(oldest)?.remove();lastComments.delete(oldest);
    }
    box.scrollTop=box.scrollHeight;
  }
  function onGift(data){
    const root=activeRoot();if(!root||!data||!data.emoji)return;
    const item=el('div','mm-live-gift-toast',
      (data.sender||'Penonton')+' mengirim '+data.emoji+' '+(data.label||'hadiah'));
    root.appendChild(item);
    window.setTimeout(()=>item.remove(),2600);
    const status=root.querySelector('.mm-live-engagement-status');
    if(status&&data.giftCounts){
      const n=Object.values(data.giftCounts).reduce((a,b)=>a+Number(b||0),0);
      status.textContent=n+' hadiah virtual gratis dikirim selama siaran ini.';
    }
  }
  function onEvent(type,data){
    if(type==='snapshot'){
      lastComments.clear();
      const box=activeRoot()?.querySelector('.mm-live-comments');
      if(box)box.replaceChildren();
      for(const entry of data.comments||[])showComment(entry);
      if(!(data.comments||[]).length&&box)box.appendChild(el('p','mm-live-engagement-empty','Belum ada komentar.'));
    }else if(type==='comment')showComment(data);
    else if(type==='gift')onGift(data);
    else if(type==='comment-removed'){
      lastComments.get(data.id)?.remove();lastComments.delete(data.id);
    }else if(type==='muted'){
      if(session?.viewerId===data.viewerId)showStatus('Anda telah dibatasi berkomentar oleh streamer.');
    }else if(type==='report'){
      if(session?.role==='host')showStatus('Ada komentar yang dilaporkan. Tinjau dan hapus bila melanggar.');
    }else if(type==='ended'){stop();}
  }
  function stop(){
    if(abort){abort.abort();abort=null;}
    if(readAbort){readAbort.abort();readAbort=null;}
    session=null;lastComments.clear();
    for(const root of document.querySelectorAll('.mm-live-engagement'))root.hidden=true;
  }
  async function api(path,options={}){
    if(!session)throw Error('NOT_JOINED');
    const headers={Accept:'application/json',Authorization:'Bearer '+session.token,
      ...(options.body?{'Content-Type':'application/json'}:{})};
    const response=await fetch(BASE+encodeURIComponent(session.id)+'/'+path,{
      ...options,headers:{...headers,...(options.headers||{})},
      credentials:'same-origin',cache:'no-store'
    });
    let result={};try{result=await response.json();}catch{}
    if(!response.ok){
      if(response.status===401)showStatus('Sesi LIVE tidak lagi aktif. Buka kembali siaran.');
      else if(response.status===429)showStatus('Terlalu cepat. Coba beberapa saat lagi.');
      else if(response.status===403)showStatus('Aksi tidak diizinkan.');
      else showStatus('Gagal mengirim. Periksa koneksi lalu coba lagi.');
      throw Error(result.error||'HTTP_'+response.status);
    }
    return result;
  }
  async function sendMessage(message){
    if(!session)return;
    await api('comments',{method:'POST',body:JSON.stringify({text:message})});
    showStatus('Komentar terkirim.');
  }
  async function sendGift(id){
    if(!session)return;
    try{await api('gifts',{method:'POST',body:JSON.stringify({giftId:id})});}
    catch{}
  }
  async function removeComment(id){
    if(!session||session.role!=='host')return;
    try{await api('comments/'+encodeURIComponent(id),{method:'DELETE'});}
    catch{}
  }
  async function reportComment(id){
    if(!session)return;
    try{
      await api('reports',{method:'POST',body:JSON.stringify({commentId:id,reason:'harassment'})});
      showStatus('Komentar dilaporkan kepada streamer.');
    }catch{}
  }
  async function readEvents(){
    if(!session)return;
    const current=session;
    readAbort=new AbortController();
    let attempts=0;
    while(!readAbort.signal.aborted&&session===current){
      try{
        const response=await fetch(BASE+encodeURIComponent(current.id)+'/events',{
          credentials:'same-origin',cache:'no-store',
          headers:{Accept:'text/event-stream',Authorization:'Bearer '+current.token},
          signal:readAbort.signal
        });
        if(!response.ok||!response.body)throw Error('EVENTS_'+response.status);
        const reader=response.body.getReader(),decoder=new TextDecoder();
        let text='';attempts=0;
        while(session===current&&!readAbort.signal.aborted){
          const part=await reader.read();if(part.done)break;
          text+=decoder.decode(part.value,{stream:true});
          let index;
          while((index=text.indexOf('\n\n'))>=0){
            const section=text.slice(0,index);text=text.slice(index+2);
            if(section.startsWith(':'))continue;
            let type='message',payload='';
            for(const line of section.split(/\r?\n/)){
              if(line.startsWith('event:'))type=line.slice(6).trim();
              if(line.startsWith('data:'))payload=line.slice(5).trim();
            }
            if(payload)try{onEvent(type,JSON.parse(payload));}catch{}
          }
        }
      }catch(error){
        if(readAbort?.signal.aborted||session!==current)return;
        attempts++;
        showStatus('Memulihkan koneksi komentar LIVE…');
        await new Promise(resolve=>window.setTimeout(resolve,Math.min(6000,700*Math.pow(1.7,attempts))));
      }
    }
  }
  function begin(details){
    if(disposed||!details||!details.streamId||!details.token||!['host','viewer'].includes(details.role))return;
    stop();
    session={id:String(details.streamId),token:String(details.token),
      role:details.role,viewerId:String(details.viewerId||'')};
    build();
    const root=activeRoot();
    if(root)root.hidden=false;
    showStatus('Hadiah virtual gratis, tanpa pembayaran atau uang tunai.');
    readEvents();
  }
  window.addEventListener('mm-live-session',event=>begin(event.detail));
  window.addEventListener('mm-live-end',stop);
  window.addEventListener('pagehide',()=>{disposed=true;stop();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build,{once:true});
  else build();
})();
