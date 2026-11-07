(()=>{'use strict';
const nameOf1873=(u,key='username')=>String(u?.[key==='username'?'displayName':key+'DisplayName']||u?.[key]||'Trader');

const $=id=>document.getElementById(id),el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n};
const date=ms=>new Date(ms).toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'});
// Bound reads only. Uploads and mutations keep their existing single-request behavior.
async function readJson(url){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetch(url,{method:'GET',credentials:'same-origin',cache:'no-store',signal:controller.signal});
  const data=await response.json().catch(error=>{if(controller.signal.aborted)throw error;return null});
  if(!response.ok){const error=Error(typeof data?.error==='string'?data.error:'Gagal memuat ('+response.status+'). Coba lagi.');error.status=response.status;throw error}
  if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Respons belum dapat dibaca. Coba lagi.');
  return data;
 }catch(error){if(controller.signal.aborted)throw Error('Koneksi terlalu lama. Coba lagi.');throw error}
 finally{clearTimeout(timer)}
}
const api=async(route,method='GET',payload,type='application/json')=>{if(method==='GET')return readJson('/api/trader-profiles/'+route);const o={method,credentials:'same-origin',cache:'no-store'};if(method!=='GET'){o.headers={'X-MarketMarney-Request':'1','Content-Type':type};o.body=type==='application/json'?JSON.stringify(payload||{}):payload}const r=await fetch('/api/trader-profiles/'+route,o);const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Gagal memuat ('+r.status+')');return d};
// Social video interactions r1: server-verified comments, likes and distinct viewers.
const vApi=async(route,method='GET',payload)=>{if(method==='GET')return readJson('/api/social-video/'+route);const opt={method,credentials:'same-origin',cache:'no-store'};if(method!=='GET'){opt.headers={'X-MarketMarney-Request':'1','Content-Type':'application/json'};opt.body=JSON.stringify(payload||{})}const res=await fetch('/api/social-video/'+route,opt);const data=await res.json().catch(()=>({}));if(!res.ok)throw Error(data.error||'Interaksi gagal ('+res.status+')');return data};
async function loadVideoStats(kind,items){if(!items.length)return;const previous=new Map(items.map(item=>[item,item.videoStats]));const ids=items.map(x=>x.id).slice(0,40);const data=await vApi('summaries?kind='+encodeURIComponent(kind)+'&ids='+encodeURIComponent(ids.join(',')));for(const item of items)if(item.videoStats===previous.get(item))item.videoStats=data.items?.[item.id]||null}
const formatVideoStat=n=>typeof n==='number'&&Number.isFinite(n)?formatCompactNumber(n):'—';
const setAvatar=(node,url,name)=>{node.replaceChildren();if(url&&/^\/media\/[a-f0-9-]{36}\.(?:png|webp|jpg)$/.test(url)){const im=el('img');im.src=url;im.alt='Avatar @'+name;im.loading='lazy';im.decoding='async';node.append(im)}else node.textContent=String(name||'TR').slice(0,2).toUpperCase()};
let storyViewTimer=0;
const storyViewedThisPage=new Set();
function renderStoryVideoStats(item){const m=item.videoStats||{};
 $('shStoryViews').textContent=formatVideoStat(m.views)+' penonton';
 $('shStoryComments').textContent='💬 '+formatVideoStat(m.comments)+' komentar';
 $('shStoryLike').textContent=(m.liked?'♥':'♡')+' '+formatVideoStat(m.likes);
 $('shStoryLike').setAttribute('aria-pressed',String(!!m.liked));
 $('shStoryViewers').hidden=!item.own;
}
async function refreshStoryVideoStats(item){try{item.videoStats=await vApi('summary?kind=story&id='+encodeURIComponent(item.id));if(state.storyItems[state.storyIndex]?.id===item.id)renderStoryVideoStats(item)}catch(e){storyFeedback(e.message,true)}}
async function registerStoryView(item){if(storyViewedThisPage.has(item.id))return;storyViewedThisPage.add(item.id);try{item.videoStats=await vApi('view','POST',{kind:'story',id:item.id});if(state.storyItems[state.storyIndex]?.id===item.id)renderStoryVideoStats(item)}catch(e){storyViewedThisPage.delete(item.id);storyFeedback(e.message,true)}}
let activeVideoComments=null;
async function openVideoComments(kind,item,onChange){activeVideoComments={kind,id:item.id,item,onChange};const dialog=$('shVideoCommentsDialog');$('shVCName').textContent=(kind==='story'?'Komentar Story':'Komentar Reels');$('shVCSub').textContent='@'+item.username+' • komentar dapat dilihat pengguna Social Marney';$('shVCStatus').textContent='';$('shVCInput').value='';if(!dialog.open)dialog.showModal();await refreshVideoComments()}
function videoCommentRow(c){const wrap=el('article','sh-vc-item');const av=el('span','sh-avatar');setAvatar(av,c.avatarUrl,c.username);const content=el('div','sh-vc-text');const line=el('div','sh-vc-author');const user=el('a','', '@'+c.username);user.href='/profil.html?user='+encodeURIComponent(c.username);line.append(user,el('time','',date(c.createdAt)));const body=el('p','',c.body);content.append(line,body);
 const tools=el('div','sh-vc-tools');if(c.canDelete){const del=actionButton('Hapus',async()=>{if(!confirm('Hapus komentar ini?'))return;del.disabled=true;try{await vApi('comments','DELETE',{id:c.id});await refreshVideoComments()}catch(e){$('shVCStatus').textContent=e.message;del.disabled=false}});tools.append(del)}else{const report=actionButton('Laporkan',async()=>{if(!confirm('Laporkan komentar ini sebagai spam?'))return;report.disabled=true;try{await vApi('report','POST',{commentId:c.id,reason:'spam'});$('shVCStatus').textContent='Laporan diterima dan dapat ditinjau admin.'}catch(e){$('shVCStatus').textContent=e.message}finally{report.disabled=false}});tools.append(report)}content.append(tools);wrap.append(av,content);return wrap}
async function refreshVideoComments(){const ctx=activeVideoComments;if(!ctx)return;const list=$('shVCList');list.replaceChildren(el('p','sh-vc-empty','Memuat komentar…'));
 try{const d=await vApi('comments?kind='+ctx.kind+'&id='+encodeURIComponent(ctx.id));if(activeVideoComments!==ctx)return;list.replaceChildren();if(!d.items.length)list.append(el('p','sh-vc-empty','Belum ada komentar. Jadilah yang pertama.'));else d.items.forEach(c=>list.append(videoCommentRow(c)));
 $('shVCCount').textContent=d.total+' komentar';$('shVCForm').hidden=!d.commentsEnabled;$('shVCDisabled').hidden=!!d.commentsEnabled;
 $('shVCToggle').hidden=!ctx.item.own;$('shVCToggle').textContent=d.commentsEnabled?'Nonaktifkan komentar':'Aktifkan komentar';
 const s=await vApi('summary?kind='+ctx.kind+'&id='+encodeURIComponent(ctx.id));if(activeVideoComments!==ctx)return;ctx.item.videoStats=s;ctx.onChange?.(s);if(ctx.kind==='story'&&state.storyItems[state.storyIndex]?.id===ctx.id)renderStoryVideoStats(ctx.item);
 }catch(e){if(activeVideoComments===ctx){list.replaceChildren();$('shVCStatus').textContent=e.message}}}
async function openStoryViewers(){const item=state.storyItems[state.storyIndex];if(!item?.own)return;const dialog=$('shStoryViewersDialog');const list=$('shStoryViewerList');list.replaceChildren(el('p','sh-vc-empty','Memuat penonton…'));if(!dialog.open)dialog.showModal();try{const d=await vApi('viewers?kind=story&id='+encodeURIComponent(item.id));list.replaceChildren();$('shViewersCount').textContent=d.total+' penonton unik';if(!d.items.length)list.append(el('p','sh-vc-empty','Belum ada akun yang melihat Story Anda.'));for(const v of d.items){const row=el('div','sh-vc-item');const av=el('span','sh-avatar');setAvatar(av,v.avatarUrl,v.username);const link=el('a','', '@'+v.username);link.href='/profil.html?user='+encodeURIComponent(v.username);const meta=el('span','sh-vc-viewer-meta',date(v.viewedAt));row.append(av,link,meta);list.append(row)}}catch(e){list.replaceChildren(el('p','sh-vc-empty',e.message))}}
const state={user:null,profile:null,auth:'loading',posts:[],nextOffset:0,hasMore:false,photoUrl:null,videoUrl:null,storyItems:[],storyIndex:0,loading:false,search:''};
const feedback=(message,error=false)=>{const n=$('shPostMessage');n.textContent=message;n.style.color=error?'#ffa2a2':'#ffcb82'};
const storyFeedback=(m,bad=false)=>{const n=$('shStoryFeedback');n.textContent=m;n.style.color=bad?'#ff9d9d':'#ffc77c'};
function storyTile(item){const b=el('button','sh-story-tile');b.type='button';b.setAttribute('aria-label','Lihat Story '+nameOf1873(item));const bg=el('div','sh-story-cover');if(item.mediaType==='image'){const im=el('img');im.src=item.mediaUrl;im.alt='';im.loading='lazy';bg.append(im)}else{const v=el('video');v.src=item.mediaUrl;v.muted=true;v.playsInline=true;v.preload='none';v.poster='/assets/video-placeholder1880.svg';v.setAttribute('aria-hidden','true');bg.append(v);bg.append(el('span','sh-video-mark','▶'))}const a=el('div','sh-avatar sh-story-avatar');setAvatar(a,item.avatarUrl,item.username);const name=el('strong','', nameOf1873(item));window.SocialIdentity1875?.badge(name,item);b.append(bg,a,name);b.addEventListener('click',()=>openStory(state.storyItems.findIndex(x=>x.id===item.id)));return b}
async function loadStories(){
 try{
  const d=await api('stories');if(!Array.isArray(d.items))throw Error('Daftar Story belum dapat dibaca.');
  state.storyItems=d.items;const items=state.storyItems,host=$('shStories');host.replaceChildren();
  const own=el('button','sh-story-add');own.type='button';own.append(el('span','sh-story-add-icon','＋'),el('strong','','Buat Story'),el('small','','Foto / video • 24 jam'));own.addEventListener('click',()=>{$('shStoryCreate').showModal()});host.append(own);
  for(const item of items)host.append(storyTile(item));if(!items.length)host.append(el('p','sh-story-empty','Belum ada Story. Jadilah yang pertama berbagi!'));
  void loadVideoStats('story',items).then(()=>{const item=items[state.storyIndex];if(state.storyItems===items&&item&&$('shStoryViewer').open)renderStoryVideoStats(item)}).catch(()=>{});
 }catch(e){const host=$('shStories');if(!host.querySelector('.sh-story-tile'))host.replaceChildren();sectionRetry(host,'shStoryRetry','Story belum dapat dimuat. '+e.message,loadStories)}
}
function openStory(index){if(index<0||index>=state.storyItems.length)return;clearTimeout(storyViewTimer);state.storyIndex=index;const item=state.storyItems[index];$('shViewName').textContent=nameOf1873(item);window.SocialIdentity1875?.badge($('shViewName'),item);$('shViewTime').textContent=date(item.createdAt);setAvatar($('shViewAvatar'),item.avatarUrl,item.username);$('shViewCaption').textContent=item.caption||'';const media=$('shViewMedia');media.replaceChildren();if(item.mediaType==='video'){const v=el('video');v.src=item.mediaUrl;v.controls=true;v.autoplay=true;v.muted=true;v.playsInline=true;v.preload='none';v.poster='/assets/video-placeholder1880.svg';media.append(v)}else{const im=el('img');im.src=item.mediaUrl;im.alt='Story dari '+nameOf1873(item);media.append(im)}$('shViewDelete').hidden=!item.own;$('shViewPrev').disabled=index===0;$('shViewNext').disabled=index===state.storyItems.length-1;const dialog=$('shStoryViewer');if(!dialog.open)dialog.showModal();renderStoryVideoStats(item);storyViewTimer=setTimeout(()=>{if(dialog.open&&state.storyItems[state.storyIndex]?.id===item.id&&!document.hidden)void registerStoryView(item)},900)}
function closeStory(){clearTimeout(storyViewTimer);const vid=$('shViewMedia').querySelector('video');if(vid)vid.pause();$('shStoryViewer').close()}
async function uploadVideo(file,kind='post'){const max=kind==='story'?12:kind==='reel'?30:20;if(!file||file.type!=='video/mp4'||file.size>max*1024*1024||!file.size)throw Error('Video MP4 maksimal '+max+' MB');return (await api('video?kind='+kind,'POST',file,'video/mp4')).url}
function openComposer(){const form=$('shComposer');form.hidden=false;$('shOpenComposer').hidden=true;$('shBody').focus()}
async function uploadImage(f){if(!f)return null;if(!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>2*1024*1024)throw Error('Foto hanya JPG/PNG/WebP maksimal 2 MB');const d=await api('image?kind=post','POST',f,f.type);return d.url}
const actionButton=(text,fn,cls='')=>{const b=el('button',cls,text);b.type='button';b.addEventListener('click',fn);return b};
function clearSectionRetry(id){$(id+'Notice')?.remove()}
function sectionRetry(host,id,message,retry,prepend=false){
 clearSectionRetry(id);const box=el('div','sh-panel sh-empty'),text=el('p','',message);box.id=id+'Notice';text.setAttribute('role','status');
 const button=actionButton('Coba lagi',async()=>{button.disabled=true;try{await retry()}catch(error){text.textContent=error.message}finally{if(button.isConnected)button.disabled=false}},'sh-outline');button.id=id;
 box.append(text,button);if(prepend)host.prepend(box);else host.append(box);return box;
}
function showComments(container,p,focusId=null){
 const host=el('section','sh-comments sh-threaded-comments');host.setAttribute('aria-label','Diskusi postingan');
 const header=el('div','sh-discussion-header');header.append(el('strong','', 'Diskusi Trader'),el('span','sh-discussion-count',p.comments+' komentar & balasan'));host.append(header);
 const list=el('div','sh-thread-list');const status=el('p','sh-muted','Memuat komentar…');status.setAttribute('role','status');host.append(list,status);
 const form=el('form','sh-comment-form sh-new-comment-form');const input=el('input');input.placeholder='Tulis komentar tentang postingan ini…';input.maxLength=500;input.required=true;input.setAttribute('aria-label','Tulis komentar');
 const submit=el('button','','Kirim');submit.type='submit';form.append(input,submit);host.append(form);container.append(host);
 const syncCount=total=>{p.comments=total;const counter=container.querySelector('[data-comment-counter]');if(counter)counter.textContent=total+' komentar';header.querySelector('.sh-discussion-count').textContent=total+' komentar & balasan'};
 const action=(label,handler,cls='')=>{const b=el('button',cls,label);b.type='button';b.addEventListener('click',handler);return b};
 const makeReplyForm=(c,slot)=>{
  const previous=host.querySelector('.sh-inline-reply-form');if(previous)previous.remove();
  const replyForm=el('form','sh-comment-form sh-inline-reply-form');const field=el('input');field.required=true;field.maxLength=500;
  const prefix=c.parentId?nameOf1873(c)+' ':'';field.placeholder='Balas '+nameOf1873(c)+'…';field.setAttribute('aria-label','Balas komentar '+nameOf1873(c));field.value=prefix;
  const send=el('button','','Balas');send.type='submit';replyForm.append(field,send);
  const cancel=action('Batal',()=>replyForm.remove(),'sh-comment-cancel');replyForm.append(cancel);slot.append(replyForm);field.focus();
  replyForm.addEventListener('submit',async event=>{event.preventDefault();const body=field.value.trim();if(!body||body===prefix.trim())return;send.disabled=true;try{await api('comments','POST',{postId:p.id,parentId:c.id,body});status.textContent='Balasan berhasil dikirim.';await refresh()}catch(err){status.textContent=err.message;send.disabled=false}});
 };
 const makeItem=(c,reply=false)=>{
  const item=el('article','sh-comment'+(reply?' sh-comment-reply':''));item.dataset.commentId=c.id;
  const av=el('button','sh-avatar');setAvatar(av,c.avatarUrl,c.username);window.SocialProfile1874?.bind(av,c);const body=el('div','sh-thread-content');const main=el('div','sh-comment-main');
  const meta=el('div','sh-comment-author');const author=el('a','', nameOf1873(c));author.href='/profil.html?user='+encodeURIComponent(c.username);window.SocialProfile1874?.bind(author,c);meta.append(author,el('time','',date(c.createdAt)));
  const message=el('p','',c.body);window.SocialLinks1876?.text(message,c.body);main.append(meta,message);body.append(main);
  const tool=el('div','sh-comment-tools');
  const like=action((c.liked?'♥':'♡')+' Suka · '+c.likes,async()=>{if(!state.user){location.href='/akun.html';return}like.disabled=true;try{const d=await api('comment-like','POST',{id:c.id});c.liked=d.liked;c.likes=d.likes;like.textContent=(c.liked?'♥':'♡')+' Suka · '+c.likes;like.classList.toggle('liked',c.liked);like.setAttribute('aria-pressed',String(c.liked))}catch(err){status.textContent=err.message}finally{like.disabled=false}},'sh-comment-like');
  like.classList.toggle('liked',!!c.liked);like.setAttribute('aria-pressed',String(!!c.liked));tool.append(like);
  tool.append(action('↩ Balas',()=>{if(!state.user){location.href='/akun.html';return}makeReplyForm(c,body)},'sh-reply-action'));
  if(state.user?.username===c.username){tool.append(action('Hapus',async()=>{if(!confirm(reply?'Hapus balasan ini?':'Hapus komentar beserta balasannya?'))return;try{await api('comments','DELETE',{id:c.id});await refresh()}catch(err){status.textContent=err.message}},'sh-comment-delete'))}
  else if(state.user){tool.append(action('Laporkan',async()=>{if(!confirm('Laporkan komentar ini sebagai spam?'))return;try{await api('comment-report','POST',{id:c.id,reason:'spam'});status.textContent='Laporan diteruskan ke admin.'}catch(err){status.textContent=err.message}},'sh-comment-report'))}
  body.append(tool);item.append(av,body);return item;
 };
 async function refresh(){try{
  const d=await api('comments?post='+encodeURIComponent(p.id)+(focusId?'&focus='+encodeURIComponent(focusId):''));list.replaceChildren();const roots=d.items.filter(c=>!c.parentId);const replies=new Map();
  for(const c of d.items){if(c.parentId){if(!replies.has(c.parentId))replies.set(c.parentId,[]);replies.get(c.parentId).push(c)}}
  for(const c of roots){const block=el('div','sh-comment-thread');block.append(makeItem(c));const children=replies.get(c.id)||[];
   if(children.length){const fold=action('Lihat '+children.length+' balasan',()=>{holder.hidden=!holder.hidden;fold.textContent=holder.hidden?'Lihat '+children.length+' balasan':'Sembunyikan balasan'},'sh-reply-toggle');block.append(fold);const holder=el('div','sh-replies');holder.hidden=false;fold.textContent='Sembunyikan '+children.length+' balasan';for(const reply of children)holder.append(makeItem(reply,true));block.append(holder)}
   list.append(block)}
  if(!d.items.length)list.append(el('p','sh-comment-empty','Belum ada komentar. Mulai diskusi yang bermanfaat.'));
  syncCount(d.total);status.textContent=focusId&&!d.focusFound?'Komentar yang dituju tidak tersedia atau sudah dihapus.':d.hasMoreRoots?'Menampilkan sebagian komentar.':' ';return d;}
  catch(err){status.textContent=err.message}}
 form.addEventListener('submit',async event=>{event.preventDefault();if(!state.user){location.href='/akun.html';return}const body=input.value.trim();if(!body)return;submit.disabled=true;try{await api('comments','POST',{postId:p.id,body});input.value='';await refresh()}catch(err){status.textContent=err.message}finally{submit.disabled=false}});
 host.ready=refresh();return host;
}
function postCard(p){
 const card=el('article','sh-panel sh-post');card.dataset.postId=p.id;const head=el('div','sh-post-header');const avatar=el('button','sh-avatar');setAvatar(avatar,p.avatarUrl,p.username);window.SocialProfile1874?.bind(avatar,p);const meta=el('div','sh-post-meta');const author=el('a','', nameOf1873(p));author.href='/profil.html?user='+encodeURIComponent(p.username);window.SocialProfile1874?.bind(author,p);const time=el('time','',date(p.createdAt));meta.append(author,time);head.append(avatar,meta);
 if(state.user){if(state.user.username===p.username){const del=actionButton('⋯',async()=>{if(!confirm('Hapus postingan ini?'))return;del.disabled=true;try{await api('posts','DELETE',{id:p.id});state.posts=state.posts.filter(x=>x.id!==p.id);if(card.closest('#shFocusedPost')){focusedPostEpoch++;card.replaceWith(el('p','sh-panel sh-empty','Postingan sudah dihapus.'))}renderPosts()}catch(e){alert(e.message);del.disabled=false}},'sh-post-options');del.title='Hapus postingan';head.append(del)}else{const report=actionButton('⋯',async()=>{if(!confirm('Laporkan postingan sebagai spam?'))return;report.disabled=true;try{await api('report','POST',{id:p.id,reason:'spam'});report.title='Sudah dilaporkan'}catch(e){alert(e.message);report.disabled=false}},'sh-post-options');report.title='Laporkan postingan';head.append(report)}}
 const body=el('p','sh-post-body',p.body);window.SocialLinks1876?.text(body,p.body);card.append(head,body);if(p.imageUrl){const photo=el('img','sh-post-photo');photo.src=p.imageUrl;photo.alt='Lampiran chart dari '+nameOf1873(p);photo.loading='lazy';card.append(photo)}if(p.videoUrl){const video=el('video','sh-post-video');video.src=p.videoUrl;video.controls=true;video.preload='none';video.poster='/assets/video-placeholder1880.svg';video.playsInline=true;video.setAttribute('aria-label','Video postingan '+nameOf1873(p));card.append(video)}
 const counts=el('div','sh-countrow');const likes=el('span','',(p.reactions?.total||0)+' reaksi');const comments=el('span','',p.comments+' komentar');comments.dataset.commentCounter='1';counts.append(likes,comments);card.append(counts);
 const react=el('div');card.append(react);window.SocialReactions1877?.mount(react,{kind:'post',id:p.id,initial:p.reactions,onChange:data=>{p.reactions=data;likes.textContent=data.total+' reaksi';}});
 const actions=el('div','sh-post-actions mm-post-actions1877');const comment=actionButton('▤ Komentar',()=>{let section=card.querySelector('.sh-comments');if(section){section.remove();return}showComments(card,p)});const share=actionButton('↗ Bagikan',async()=>{const url=location.origin+'/beranda-trader.html?post='+encodeURIComponent(p.id);try{await navigator.clipboard.writeText(url);share.textContent='✓ Tautan postingan disalin'}catch{share.textContent='Buka postingan';location.href=url}});actions.append(comment,share);card.append(actions);return card;
}
window.addEventListener('mm:follow-updated',()=>{if(state.user)void refreshFriends().catch(()=>{});});
// v18.7.2 — deep links are resolved by ID, not by the first feed page or the author's profile.
let focusedPostEpoch=0;
const validLinkId=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
function focusElement(node){
 if(!node||!node.isConnected)return;
 node.tabIndex=-1;node.classList.add('sh-target1872');
 const top=(document.querySelector('.sh-topbar')?.getBoundingClientRect().height||72)+18;
 node.style.scrollMarginTop=top+'px';node.focus({preventScroll:true});node.scrollIntoView({behavior:'instant',block:'start'});
}
async function loadFocusedPost(){
 const params=new URLSearchParams(location.search),postId=params.get('post');
 if(!postId)return;
 const epoch=++focusedPostEpoch,existing=$('shFocusedPost');if(existing)existing.remove();
 const panel=el('section','sh-focused1872');panel.id='shFocusedPost';panel.setAttribute('aria-label','Postingan yang dituju');
 const heading=el('div','sh-focused-head1872'),title=el('h2','','Diskusi postingan');
 const close=actionButton('Kembali ke linimasa',()=>{focusedPostEpoch++;panel.remove();const url=new URL(location.href);url.searchParams.delete('post');url.searchParams.delete('comment');history.replaceState(null,'',url.pathname+url.search);const feed=$('shFeed');focusElement(feed)});
 heading.append(title,close);const content=el('div'),note=el('p','sh-panel sh-empty','Memuat postingan…');note.setAttribute('role','status');content.append(note);panel.append(heading,content);$('shLogged').prepend(panel);
 if(!validLinkId(postId)){note.textContent='Tautan postingan tidak valid.';focusElement(note);return}
 const commentParam=params.get('comment'),commentId=validLinkId(commentParam)?commentParam:null;
 try{
  const data=await api('post?id='+encodeURIComponent(postId));if(epoch!==focusedPostEpoch||!panel.isConnected)return;
  const card=postCard(data.post);content.replaceChildren(card);
  const thread=showComments(card,data.post,commentId);await thread.ready;
  if(epoch!==focusedPostEpoch||!panel.isConnected)return;
  const target=commentId?[...thread.querySelectorAll('[data-comment-id]')].find(n=>n.dataset.commentId===commentId):null;
  focusElement(target||card);
 }catch(e){if(epoch!==focusedPostEpoch||!panel.isConnected)return;note.textContent=e.message;const retry=actionButton('Coba lagi',loadFocusedPost);content.replaceChildren(note,retry);focusElement(note)}
}
window.addEventListener('popstate',()=>{focusedPostEpoch++;const old=$('shFocusedPost');if(old)old.remove();if(state.user)loadFocusedPost()});
let localSearchTimer=0;
function renderPosts(append=false){
 clearTimeout(localSearchTimer);
 const list=state.posts.filter(p=>!state.search||((p.body+' '+p.username+' '+nameOf1873(p)).toLowerCase().includes(state.search)));
 const oldest=$('shSort').value==='oldest';if(oldest)list.reverse();const host=$('shFeed'),existing=[...host.children];
 // Keep current media, open comments and their listeners when adding the next page.
 const canAppend=append===true&&!state.search&&!oldest&&existing.every((card,i)=>card.classList.contains('sh-post')&&card.dataset.postId===String(list[i]?.id));
 if(canAppend)list.slice(existing.length).forEach(p=>host.append(postCard(p)));
 else{host.replaceChildren();if(!list.length)host.append(el('div','sh-panel sh-empty',state.search?'Tidak ada postingan yang cocok dengan pencarian.':'Belum ada postingan. Jadilah yang pertama berbagi analisa.'));else list.forEach(p=>host.append(postCard(p)))}
 $('shPostCount').textContent=String(state.posts.length);$('shMore').hidden=!state.hasMore||!!state.search;
}
async function loadFeed(reset=false){
 if(state.loading)return;state.loading=true;const more=$('shMore');more.disabled=true;more.textContent='Memuat…';
 try{
  const data=await api('feed?offset='+(reset?0:state.nextOffset));if(!Array.isArray(data.items))throw Error('Daftar postingan belum dapat dibaca.');
  if(reset){state.posts=data.items;state.nextOffset=data.items.length}else{state.posts.push(...data.items);state.nextOffset+=data.items.length}
  state.hasMore=!!data.hasMore;clearSectionRetry('shFeedRetry');renderPosts(!reset);
 }catch(e){const host=$('shFeed');if(!state.posts.length)host.replaceChildren();sectionRetry(host,'shFeedRetry','Postingan belum dapat dimuat. '+e.message,()=>loadFeed(reset))}
 finally{state.loading=false;more.disabled=false;more.textContent='Muat postingan lainnya'}
}
let authBusy=false,profileBusy=false;
function sessionState(value){state.auth=value;document.documentElement.dataset.mmAuthState=value;window.dispatchEvent(new CustomEvent('mm:auth-state',{detail:{state:value}}))}
function sessionStatus(message,retry=false){
 let box=$('shSessionStatus');if(!box){box=el('section','sh-panel sh-empty');box.id='shSessionStatus';$('shGuest').before(box)}
 const text=el('p','',message);text.setAttribute('role','status');box.replaceChildren(text);
 if(retry){const button=actionButton('Coba lagi',boot,'sh-outline');button.id='shSessionRetry';box.append(button)}
}
function showGuest(){
 state.user=null;state.profile=null;$('shSessionStatus')?.remove();$('shGuest').hidden=false;$('shLogged').hidden=true;$('mmDesk').hidden=true;
 $('shUsername').textContent='Social Marney';$('shBio').textContent='Masuk untuk bergabung dan berbagi analisa.';sessionState('guest');
}
function applyProfile(profile){
 state.profile=profile;$('shUsername').textContent=nameOf1873(profile);window.SocialIdentity1875?.badge($('shUsername'),profile);
 $('shBio').textContent=typeof profile.bio==='string'&&profile.bio?profile.bio:'Profil Anda belum memiliki bio. Tambahkan di pengaturan akun.';
 setAvatar($('shSideAvatar'),profile.avatarUrl,profile.username);setAvatar($('shComposerAvatar'),profile.avatarUrl,profile.username);
 $('shPublicProfile').href='/profil.html?user='+encodeURIComponent(profile.username);
}
async function loadProfile(){
 if(profileBusy||!state.user)return;profileBusy=true;
 try{const d=await api('me');if(!d.profile||typeof d.profile.username!=='string'||!d.profile.username.trim())throw Error('Data profil belum dapat dibaca.');applyProfile(d.profile);clearSectionRetry('shProfileRetry')}
 catch(error){sectionRetry($('shLogged'),'shProfileRetry','Profil belum dapat dimuat. Fitur Social tetap tersedia. '+error.message,loadProfile,true)}
 finally{profileBusy=false}
}
async function boot(){
 if(authBusy||state.user)return;authBusy=true;$('shGuest').hidden=true;$('shLogged').hidden=true;sessionState('loading');sessionStatus('Memuat sesi Social Marney…');
 let session;
 try{
  session=await readJson('/api/community/status');
  if(session.user===null){showGuest();return}
  if(!session.user||typeof session.user.username!=='string'||!session.user.username.trim())throw Error('Sesi belum dapat dibaca. Coba lagi.');
 }catch(error){
  if(error.status===401||error.status===403)showGuest();
  else{sessionStatus('Sesi belum dapat dimuat. '+error.message,true);sessionState('error')}
  return;
 }finally{authBusy=false}
 state.user=session.user;applyProfile({...session.user,username:session.user.username});
 $('shTopAccount').textContent='@'+session.user.username;$('shSessionStatus')?.remove();$('shLogged').hidden=false;$('mmDesk').hidden=false;
 armReelLoader();sessionState('authenticated');
 // Optional profile data never gates authenticated features or changes guest state.
 void loadProfile();void loadFeed(true);void loadStories();void loadFriends();void loadConnect();void loadFocusedPost();
}
$('shOpenComposer').addEventListener('click',openComposer);$('shQuickPhoto').addEventListener('click',()=>{openComposer();$('shPhoto').click()});$('shQuickVideo').addEventListener('click',()=>{openComposer();$('shVideo').click()});$('shQuickStory').addEventListener('click',()=>{$('shStoryCreate').showModal()});$('shQuickReel').addEventListener('click',()=>{$('shReelsPanel').open=true;$('shReelVideo').click()});
$('shPhoto').addEventListener('change',async e=>{const f=e.target.files[0];if(!f){state.photoUrl=null;return}feedback('Mengunggah foto…');try{state.photoUrl=await uploadImage(f);state.videoUrl=null;$('shVideo').value='';$('shPhotoName').textContent=f.name;feedback('Foto siap dilampirkan.')}catch(err){state.photoUrl=null;e.target.value='';feedback(err.message,true)}});
$('shVideo').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;feedback('Mengunggah video…');try{state.videoUrl=await uploadVideo(f);state.photoUrl=null;$('shPhoto').value='';$('shPhotoName').textContent=f.name;feedback('Video berhasil diunggah.')}catch(err){state.videoUrl=null;e.target.value='';feedback(err.message,true)}});
$('shStoryCancel').addEventListener('click',()=>{$('shStoryCreate').close()});$('shViewClose').addEventListener('click',closeStory);$('shViewPrev').addEventListener('click',()=>openStory(state.storyIndex-1));$('shViewNext').addEventListener('click',()=>openStory(state.storyIndex+1));$('shStoryViewer').addEventListener('close',()=>{clearTimeout(storyViewTimer);const v=$('shViewMedia').querySelector('video');if(v)v.pause()});$('shViewDelete').addEventListener('click',async()=>{const item=state.storyItems[state.storyIndex];if(!item?.own||!confirm('Hapus Story Anda?'))return;try{await api('stories','DELETE',{id:item.id});closeStory();await loadStories()}catch(e){storyFeedback(e.message,true)}});
$('shStoryLike').addEventListener('click',async()=>{const item=state.storyItems[state.storyIndex];if(!item)return;const btn=$('shStoryLike');btn.disabled=true;try{item.videoStats=await vApi('like','POST',{kind:'story',id:item.id});renderStoryVideoStats(item)}catch(e){storyFeedback(e.message,true)}finally{btn.disabled=false}});
$('shStoryComments').addEventListener('click',()=>{const item=state.storyItems[state.storyIndex];if(item)void openVideoComments('story',item)});
$('shStoryViewers').addEventListener('click',()=>void openStoryViewers());
$('shViewersClose').addEventListener('click',()=>$('shStoryViewersDialog').close());
$('shVCClose').addEventListener('click',()=>$('shVideoCommentsDialog').close());
$('shVideoCommentsDialog').addEventListener('close',()=>{activeVideoComments=null});
$('shVCForm').addEventListener('submit',async e=>{e.preventDefault();const ctx=activeVideoComments;if(!ctx)return;const text=$('shVCInput').value.trim();if(!text)return;const submit=$('shVCSend');submit.disabled=true;try{await vApi('comments','POST',{kind:ctx.kind,id:ctx.id,body:text});$('shVCInput').value='';$('shVCStatus').textContent='Komentar dikirim.';await refreshVideoComments()}catch(err){$('shVCStatus').textContent=err.message}finally{submit.disabled=false}});
$('shVCToggle').addEventListener('click',async()=>{const ctx=activeVideoComments;if(!ctx||!ctx.item.own)return;const btn=$('shVCToggle');btn.disabled=true;try{const m=await vApi('comment-settings','POST',{kind:ctx.kind,id:ctx.id,enabled:!ctx.item.videoStats?.commentsEnabled});ctx.item.videoStats=m;await refreshVideoComments()}catch(e){$('shVCStatus').textContent=e.message}finally{btn.disabled=false}});
$('shStoryForm').addEventListener('submit',async e=>{e.preventDefault();const file=$('shStoryFile').files[0],submit=$('shStorySubmit');if(!file)return;submit.disabled=true;$('shStoryUploadStatus').textContent='Mengunggah Story…';try{let mediaType,mediaUrl;if(file.type==='video/mp4'){mediaType='video';mediaUrl=await uploadVideo(file,'story')}else{mediaType='image';mediaUrl=await uploadImage(file)}await api('stories','POST',{mediaUrl,mediaType,caption:$('shStoryCaption').value.trim()});$('shStoryForm').reset();$('shStoryUploadStatus').textContent='';$('shStoryCreate').close();storyFeedback('Story berhasil diterbitkan selama 24 jam.');await loadStories()}catch(err){$('shStoryUploadStatus').textContent=err.message}finally{submit.disabled=false}});
$('shStoryFile').addEventListener('change',e=>{$('shStoryFileName').textContent=e.target.files[0]?.name||'Foto maks. 2 MB • Video MP4 maks. 12 MB'});
$('shComposer').addEventListener('submit',async e=>{e.preventDefault();if(!state.user){location.href='/akun.html';return}const body=$('shBody').value.trim();if(!body&&!state.photoUrl&&!state.videoUrl){feedback('Tulis pesan atau pilih media.',true);return}const btn=$('shPublish');btn.disabled=true;try{await api('posts','POST',{body,imageUrl:state.photoUrl,videoUrl:state.videoUrl});$('shBody').value='';$('shPhoto').value='';$('shVideo').value='';$('shPhotoName').textContent='Media opsional';state.photoUrl=null;state.videoUrl=null;feedback('Postingan berhasil diterbitkan.');await loadFeed(true)}catch(e){feedback(e.message,true)}finally{btn.disabled=false}});
$('shSearch').addEventListener('input',e=>{state.search=e.target.value.trim().toLowerCase();clearTimeout(localSearchTimer);if(state.search)localSearchTimer=setTimeout(renderPosts,180);else renderPosts();scheduleUnifiedSearch()});$('shSort').addEventListener('change',renderPosts);$('shMore').addEventListener('click',()=>loadFeed());
// MarketMarney v18.4.6: actual directional follows, one-click Follow / Unfollow.
const fapi=async(route='',method='GET',payload)=>{if(method==='GET')return readJson('/api/trader-follow'+route);const o={method,credentials:'same-origin',cache:'no-store'};if(method!=='GET'){o.headers={'Content-Type':'application/json','X-MarketMarney-Request':'1'};o.body=JSON.stringify(payload||{})}const r=await fetch('/api/trader-follow'+route,o),d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Permintaan gagal');return d};
const themeApi=async(theme)=>{const r=await fetch('/api/trader-friends/theme',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-MarketMarney-Request':'1'},body:JSON.stringify({theme})});if(!r.ok)throw Error('Pilihan tema belum tersimpan')};
const friendMsg=(msg,bad=false)=>{const node=$('shFriendMessage');node.textContent=msg;node.classList.toggle('is-error',bad)};
async function loadFriends(){try{await refreshFriends();clearSectionRetry('shFriendsRetry')}catch(error){sectionRetry($('shFriendBody'),'shFriendsRetry','Jaringan trader belum dapat dimuat. '+error.message,loadFriends)}}
function makeFollowUser(u){const row=el('div','sh-friend-user sh-follow-user'),av=el('div','sh-avatar sh-friend-avatar');setAvatar(av,u.avatarUrl,u.username);
 const main=el('div','sh-friend-detail'),link=el('a','sh-friend-name',nameOf1873(u));link.href='/profil.html?user='+encodeURIComponent(u.username);link.title='@'+u.username;window.SocialIdentity1875?.badge(link,u);
 const detail=el('small','',u.isSelf?'Akun Anda':u.mutual?'Saling mengikuti':u.followsYou?'Mengikuti Anda':(u.bio||'Profil trader MarketMarney').slice(0,75));main.append(link,detail);
 const tools=el('div','sh-friend-actions');if(!u.isSelf){const btn=el('button',u.isFollowing?'sh-follow-active':'sh-follow-primary',u.isFollowing?'Mengikuti ✓':'＋ Follow');btn.type='button';btn.setAttribute('aria-label',(u.isFollowing?'Unfollow ':'Follow ')+nameOf1873(u));btn.addEventListener('click',async()=>{btn.disabled=true;try{await fapi('',u.isFollowing?'DELETE':'POST',{username:u.username});await refreshFriends();if($('shFriendQuery').value.trim().length>=2)await searchFriends();friendMsg(u.isFollowing?'Berhenti mengikuti '+nameOf1873(u):'Sekarang mengikuti '+nameOf1873(u))}catch(e){friendMsg(e.message,true)}finally{btn.disabled=false}});tools.append(btn)}
 row.append(av,main,tools);return row}
async function refreshFriends(){const d=await fapi('/me');$('shFriendCount').textContent=d.followerCount+' pengikut · '+d.followingCount+' mengikuti';$('shRequestCount').textContent=String(d.followerCount);$('shSentCount').textContent=String(d.followingCount);
 const followers=$('shFriendIncoming'),mutual=$('shFriendAccepted'),following=$('shFriendOutgoing');followers.replaceChildren();mutual.replaceChildren();following.replaceChildren();
 if(!d.followers.length)followers.append(el('p','sh-friend-empty','Belum ada pengikut.'));
 d.followers.slice(0,25).forEach(u=>followers.append(makeFollowUser(u)));
 const pairs=d.following.filter(x=>x.mutual);if(!pairs.length)mutual.append(el('p','sh-friend-empty','Belum ada akun yang saling mengikuti.'));
 pairs.slice(0,25).forEach(u=>mutual.append(makeFollowUser(u)));
 if(!d.following.length)following.append(el('p','sh-friend-empty','Belum mengikuti trader lain.'));
 d.following.slice(0,25).forEach(u=>following.append(makeFollowUser(u)));
 if(!themeChosenThisPage)applyTraderTheme(d.theme,false);else if(themePending!==null&&!themeWriting)saveTraderTheme(themePending);
}
async function searchFriends(){const q=$('shFriendQuery').value.trim().replace(/^@/,'');const host=$('shFriendResults');host.replaceChildren();if(q.length<2){friendMsg('Masukkan minimal dua karakter nama atau username.');return}
 try{const d=await fapi('/search?q='+encodeURIComponent(q));friendMsg(d.items.length?'Ditemukan '+d.items.length+' akun Social Marney.':d.hint||'Tidak ditemukan.');d.items.forEach(u=>host.append(makeFollowUser(u)))}catch(e){friendMsg(e.message,true)}}
let themeChosenThisPage=false,themePending=null,themeWriting=false;
async function saveTraderTheme(theme){
 themePending=theme;if(themeWriting||!state.user)return;themeWriting=true;
 try{while(themePending!==null&&state.user){const next=themePending;themePending=null;try{await themeApi(next)}catch(e){if(themePending===null){$('shThemeStatus').textContent='Tema diterapkan di perangkat ini, tetapi belum tersimpan ke akun.';friendMsg(e.message,true)}}}}
 finally{themeWriting=false}
}
function applyTraderTheme(theme,persist=true){
 const safe=theme==='dark'?'dark':'light',root=document.documentElement;
 root.dataset.traderTheme=safe;
 $('shTheme').querySelectorAll('[data-sh-theme]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.shTheme===safe)));
 const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=safe==='light'?'#f3f7fb':'#0b141d';
 try{localStorage.setItem('mm1839-last-theme',safe)}catch{}
 if(persist){themeChosenThisPage=true;$('shThemeStatus').textContent=safe==='light'?'Tema terang aktif.':'Tema gelap aktif.';saveTraderTheme(safe)}
}

// Trader Connect v18.4.1 — premium follow, messages, groups, and vertical reels.
const cApi=async(route,method='GET',payload)=>{if(method==='GET')return readJson('/api/trader-connect'+route);const opts={method,credentials:'same-origin',cache:'no-store'};if(method!=='GET'){opts.headers={'Content-Type':'application/json','X-MarketMarney-Request':'1'};opts.body=JSON.stringify(payload||{})}const r=await fetch('/api/trader-connect'+route,opts);const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Permintaan gagal');return d};
const connectState={dmUser:null,groupId:null,reelVideoUrl:null,reelObserver:null,reelLoadObserver:null,reelsLoading:false};
const dmStatus=(m,bad=false)=>{const n=$('shDmStatus');n.textContent=m||'';n.classList.toggle('is-error',!!bad)};
const groupStatus=(m,bad=false)=>{const n=$('shGroupStatus');n.textContent=m||'';n.classList.toggle('is-error',!!bad)};
const reelStatus=(m,bad=false)=>{const n=$('shReelStatus');n.textContent=m||'';n.style.color=bad?'#ff9d9d':'#ffcb82'};
function renderDmList(items){const host=$('shDmList');host.replaceChildren();$('shDmComposerArea').hidden=!items.length;if(!items.length){host.append(el('p','sh-friend-empty','Belum ada koneksi yang saling mengikuti untuk diajak chat.'));return}for(const item of items){const row=el('div','sh-dm-user');const av=el('div','sh-avatar');setAvatar(av,item.avatarUrl,item.username);const meta=el('div','sh-dm-meta');meta.append(el('strong','', nameOf1873(item)),el('small','',item.lastMessage?item.lastMessage.slice(0,70):(item.bio||'Belum ada percakapan')));window.SocialIdentity1875?.badge(meta.querySelector('strong'),item);const btn=el('button','',connectState.dmUser===item.username?'Terbuka':'Buka');btn.type='button';btn.addEventListener('click',()=>openDm(item.username));row.append(av,meta,btn);host.append(row)}}
function renderDmThread(items){const host=$('shDmThread');host.replaceChildren();if(!items.length){host.append(el('p','sh-friend-empty','Belum ada pesan. Mulai komunikasi dengan trader ini.'));return}for(const msg of items){const bubble=el('div','sh-dm-bubble'+(msg.mine?' mine':''));bubble.textContent=msg.body;bubble.append(el('small','',date(msg.createdAt)));host.append(bubble)}host.scrollTop=host.scrollHeight}
async function openDm(username){connectState.dmUser=username;dmStatus('');$('shDmTarget').textContent='Memuat percakapan dengan @'+username+'…';try{const d=await cApi('/messages?username='+encodeURIComponent(username));$('shDmComposerArea').hidden=false;$('shDmTarget').textContent='Pesan pribadi dengan '+nameOf1873(d.with);renderDmThread(d.items);if(d.readThroughId)await cApi('/messages/read','POST',{username:d.with.username,throughId:d.readThroughId});window.dispatchEvent(new CustomEvent('mm:dm-updated'));const list=await cApi('/conversations');renderDmList(list.items)}catch(e){dmStatus(e.message,true)}}
function renderGroupList(mine,discover){const host=$('shGroupList');host.replaceChildren();const seen=new Set();const all=[...(mine||[]),...(discover||[])].filter(g=>!seen.has(g.id)&&(seen.add(g.id),true)).slice(0,4);if(!all.length){host.append(el('p','sh-friend-empty','Belum ada grup. Buka ruang grup untuk mulai berdiskusi.'));return}for(const g of all){const row=el('div','sh-group-item'),info=el('div');info.append(el('strong','',g.name),el('small','',g.members+' anggota'));const link=el('a','sh-group-room-link','Buka ↗');link.href='/grup-trader.html?group='+encodeURIComponent(g.id);link.setAttribute('aria-label','Buka ruang '+g.name);row.append(info,link);host.append(row)}}
function openGroup(id){window.location.assign('/grup-trader.html?group='+encodeURIComponent(id))}

function formatCompactNumber(value){return new Intl.NumberFormat('id-ID',{notation:'compact',maximumFractionDigits:1}).format(Math.max(0,Number(value)||0))}
const reelStatViews=new WeakMap();
function reelMetrics(item){return item.videoStats||{liked:false,likes:null,comments:null,views:null}}
function setReelPlaying(video,playing){const card=video.closest('.sh-reel-card');if(!card)return;card.classList.toggle('is-playing',!!playing)}
function pauseReels(){for(const video of document.querySelectorAll('.sh-reel-video')){video.pause();setReelPlaying(video,false)}}
let reelPlayFrame=0;
function autoPlayVisibleReels(){
 if(document.hidden){pauseReels();return}
 const conserve=Boolean(navigator.connection?.saveData)||window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
 const videos=[...document.querySelectorAll('.sh-reel-video')];
 const target=null; // Video starts only from the user's play control.
 for(const video of videos){if(video!==target){if(video.closest('.sh-reel-card')?.classList.contains('is-visible'))continue;video.pause();setReelPlaying(video,false)}}
 if(target&&target.paused){target.play().then(()=>setReelPlaying(target,true)).catch(()=>setReelPlaying(target,false))}
}
function scheduleReelPlayback(){if(reelPlayFrame)return;reelPlayFrame=requestAnimationFrame(()=>{reelPlayFrame=0;autoPlayVisibleReels()})}
function bindReelObserver(){if(connectState.reelObserver)connectState.reelObserver.disconnect();if(!('IntersectionObserver' in window))return;
 connectState.reelObserver=new IntersectionObserver(entries=>{for(const entry of entries){entry.target.classList.toggle('is-visible',entry.isIntersecting&&entry.intersectionRatio>.6)}scheduleReelPlayback()},{threshold:[.2,.6,.9]});
 document.querySelectorAll('.sh-reel-card').forEach(card=>connectState.reelObserver.observe(card))}
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseReels();else scheduleReelPlayback()});
window.addEventListener('pagehide',pauseReels);
function reelActionButton(icon,label,count){const btn=el('button','sh-reel-rail-btn');btn.type='button';btn.innerHTML=`<span class="sh-reel-rail-icon">${icon}</span><strong>${count}</strong><small>${label}</small>`;return btn}
function reelCard(item){
 const data=reelMetrics(item),card=el('article','sh-reel-card');card.dataset.reelId=item.id;
 const media=el('div','sh-reel-stage'),video=el('video','sh-reel-video');video.src=item.videoUrl;video.loop=true;video.muted=true;video.autoplay=false;video.controls=false;video.preload='none';video.poster='/assets/video-placeholder1880.svg';video.playsInline=true;video.setAttribute('aria-label','Reel video '+nameOf1873(item));media.append(video);
 const overlay=el('div','sh-reel-overlay');overlay.setAttribute('role','button');overlay.tabIndex=0;overlay.setAttribute('aria-label','Putar atau jeda Reel');const toggleReel=()=>{if(video.paused){pauseReels();video.play().then(()=>setReelPlaying(video,true)).catch(()=>reelStatus('Video belum dapat diputar. Coba lagi.'))}else{video.pause();setReelPlaying(video,false)}};overlay.addEventListener('click',toggleReel);overlay.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleReel()}});
 const top=el('div','sh-reel-topline');top.append(el('span','sh-reel-chip','REEL'),el('span','sh-reel-chip sh-reel-chip-soft','Ketuk untuk menonton'));overlay.append(top);
 const bottom=el('div','sh-reel-bottom'),author=el('div','sh-reel-author'),av=el('div','sh-avatar');setAvatar(av,item.avatarUrl,item.username);const meta=el('div','sh-reel-meta');meta.append(el('strong','',nameOf1873(item)),el('small','',date(item.createdAt)));window.SocialIdentity1875?.badge(meta.querySelector('strong'),item);author.append(av,meta);bottom.append(author);if(item.caption)bottom.append(el('p','sh-reel-caption',item.caption));const footer=el('div','sh-reel-footer');footer.append(el('span','sh-reel-tip','Ketuk video untuk jeda / putar'));overlay.append(bottom,footer);media.append(overlay);
 const rail=el('div','sh-reel-rail');
 const likeBtn=reelActionButton(data.liked?'♥':'♡','Suka',formatVideoStat(data.likes));likeBtn.setAttribute('aria-label','Sukai Reel');likeBtn.setAttribute('aria-pressed',String(!!data.liked));
 const commentBtn=reelActionButton('💬','Komentar',formatVideoStat(data.comments));commentBtn.setAttribute('aria-label','Buka komentar Reel');
 const shareBtn=reelActionButton('↗','Bagikan','');shareBtn.addEventListener('click',async()=>{const url=location.origin+'/beranda-trader.html?reel='+encodeURIComponent(item.id)+'#shReelsPanel';try{await navigator.clipboard.writeText(url);reelStatus('Tautan Reel disalin.')}catch{reelStatus('Tautan Reel: '+url)}});
 const volumeBtn=reelActionButton('🔇','Suara','Off');volumeBtn.addEventListener('click',()=>{video.muted=!video.muted;volumeBtn.innerHTML=`<span class="sh-reel-rail-icon">${video.muted?'🔇':'🔊'}</span><strong>${video.muted?'Off':'On'}</strong><small>Suara</small>`});
 const viewCount=el('div','sh-reel-views');viewCount.append(el('span','','◉'),el('strong','',formatVideoStat(data.views)),el('small','','Penonton'));viewCount.setAttribute('aria-label',formatVideoStat(data.views)+' penonton');
 const updateMetrics=m=>{item.videoStats=m;likeBtn.querySelector('.sh-reel-rail-icon').textContent=m.liked?'♥':'♡';likeBtn.querySelector('strong').textContent=formatVideoStat(m.likes);likeBtn.setAttribute('aria-pressed',String(!!m.liked));commentBtn.querySelector('strong').textContent=formatVideoStat(m.comments);viewCount.querySelector('strong').textContent=formatVideoStat(m.views);viewCount.setAttribute('aria-label',formatVideoStat(m.views)+' penonton')};
 reelStatViews.set(item,{card,updateMetrics});
 likeBtn.addEventListener('click',async()=>{likeBtn.disabled=true;try{updateMetrics(await vApi('like','POST',{kind:'reel',id:item.id}))}catch(e){reelStatus(e.message,true)}finally{likeBtn.disabled=false}});
 commentBtn.addEventListener('click',()=>void openVideoComments('reel',item,updateMetrics));
 rail.append(likeBtn,commentBtn,shareBtn,volumeBtn,viewCount);
 if(item.own){const del=reelActionButton('🗑','Hapus','');del.addEventListener('click',async()=>{if(!confirm('Hapus reel ini?'))return;try{await cApi('/reels','DELETE',{id:item.id});reelStatus('Reel dihapus.');await loadReels()}catch(e){reelStatus(e.message,true)}});rail.append(del)}
 card.append(media,rail);
 let tracked=false,started=0;
 video.addEventListener('play',()=>{started=video.currentTime||0});
 const track=()=>{if(tracked||document.hidden||!video.closest('.sh-reel-card')?.isConnected)return;const seconds=video.currentTime-started;if(seconds<3&&!(video.duration>0&&video.duration<=3&&seconds>=Math.min(1,video.duration/2)))return;tracked=true;void vApi('view','POST',{kind:'reel',id:item.id}).then(updateMetrics).catch(()=>{tracked=false})};
 video.addEventListener('timeupdate',track);video.addEventListener('ended',track);
 video.addEventListener('click',()=>{if(video.paused){video.play().then(()=>setReelPlaying(video,true)).catch(()=>{})}else{video.pause();setReelPlaying(video,false)}});
 return card}
async function loadReels(){
 if(connectState.reelsLoading)return;connectState.reelsLoading=true;
 if(connectState.reelLoadObserver){connectState.reelLoadObserver.disconnect();connectState.reelLoadObserver=null}
 try{
  const d=await cApi('/reels');if(!Array.isArray(d.items))throw Error('Daftar Reels belum dapat dibaca.');
  const items=d.items,host=$('shReelFeed');host.replaceChildren();
  if(!items.length)host.append(el('p','sh-friend-empty','Belum ada reel video. Tambahkan video reel pertama.'));else items.forEach(item=>host.append(reelCard(item)));
  connectState.reelsLoaded=true;bindReelObserver();scheduleReelPlayback();
  // Counts are optional; slow statistics must not hold the videos off screen.
  void loadVideoStats('reel',items).then(()=>{for(const item of items){const view=reelStatViews.get(item);if(view?.card.isConnected&&item.videoStats)view.updateMetrics(item.videoStats)}}).catch(()=>{});
  const wanted=new URL(location.href).searchParams.get('reel');if(wanted){const target=[...host.querySelectorAll('[data-reel-id]')].find(card=>card.dataset.reelId===wanted);if(target){$('shReelsPanel').open=true;target.scrollIntoView({block:'center',behavior:'auto'})}}
 }catch(e){const host=$('shReelFeed');if(!host.querySelector('.sh-reel-card'))host.replaceChildren();sectionRetry(host,'shReelsRetry','Reels belum dapat dimuat. '+e.message,loadReels)}
 finally{connectState.reelsLoading=false}
}
function armReelLoader(){
 const panel=$('shReelsPanel');if(!panel||connectState.reelLoaderArmed)return;connectState.reelLoaderArmed=true;
 panel.addEventListener('toggle',()=>{if(panel.open&&!connectState.reelsLoaded)void loadReels()});
 if(document.documentElement.dataset.mm44View==='reels'||new URL(location.href).searchParams.has('reel')||!('IntersectionObserver' in window)){void loadReels();return}
 connectState.reelLoadObserver=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))void loadReels()},{rootMargin:'550px 0px',threshold:0});
 connectState.reelLoadObserver.observe(panel);
}
async function loadConversations(){
 try{const conv=await cApi('/conversations');if(!Array.isArray(conv.items))throw Error('Daftar percakapan belum dapat dibaca.');renderDmList(conv.items);clearSectionRetry('shDmRetry');if(connectState.dmUser)await openDm(connectState.dmUser);else $('shDmComposerArea').hidden=true}
 catch(error){sectionRetry($('shMessagePanel'),'shDmRetry','Pesan belum dapat dimuat. '+error.message,loadConversations)}
}
async function loadGroups(){
 try{const groups=await cApi('/groups');if(!Array.isArray(groups.mine)||!Array.isArray(groups.discover))throw Error('Daftar grup belum dapat dibaca.');renderGroupList(groups.mine,groups.discover);clearSectionRetry('shGroupRetry')}
 catch(error){sectionRetry($('shGroupPanel'),'shGroupRetry','Grup belum dapat dimuat. '+error.message,loadGroups)}
}
function loadConnect(){return Promise.allSettled([loadConversations(),loadGroups()])}
window.addEventListener('mm:dm-open',e=>{const username=e.detail?.username;if(username&&state.user)openDm(username)});
$('shDmForm').addEventListener('submit',async e=>{e.preventDefault();if(!connectState.dmUser)return;const input=$('shDmBody'),body=input.value.trim();if(!body)return;const btn=e.submitter||$('shDmForm').querySelector('button[type="submit"]');btn.disabled=true;try{await cApi('/messages','POST',{username:connectState.dmUser,body});input.value='';await openDm(connectState.dmUser)}catch(err){dmStatus(err.message,true)}finally{btn.disabled=false}});
$('shGroupCreate').addEventListener('submit',async e=>{e.preventDefault();const name=$('shGroupName').value.trim(),description=$('shGroupDesc').value.trim();const btn=e.submitter||$('shGroupCreate').querySelector('button');btn.disabled=true;try{const d=await cApi('/groups','POST',{name,description});$('shGroupCreate').reset();groupStatus('Grup berhasil dibuat.');await loadConnect();await openGroup(d.id)}catch(err){groupStatus(err.message,true)}finally{btn.disabled=false}});

$('shReelVideo').addEventListener('change',async e=>{const file=e.target.files[0];if(!file){connectState.reelVideoUrl=null;return}reelStatus('Mengunggah video reel…');try{connectState.reelVideoUrl=await uploadVideo(file,'reel');reelStatus('Video reel siap diterbitkan.')}catch(err){connectState.reelVideoUrl=null;e.target.value='';reelStatus(err.message,true)}});
$('shReelForm').addEventListener('submit',async e=>{e.preventDefault();if(!connectState.reelVideoUrl){reelStatus('Pilih video reel terlebih dahulu.',true);return}const btn=e.submitter||$('shReelForm').querySelector('button');btn.disabled=true;try{await cApi('/reels','POST',{videoUrl:connectState.reelVideoUrl,caption:$('shReelCaption').value.trim()});$('shReelForm').reset();connectState.reelVideoUrl=null;reelStatus('Reel berhasil diterbitkan.');await loadReels()}catch(err){reelStatus(err.message,true)}finally{btn.disabled=false}});
$('shFriendShortcut').addEventListener('click',e=>{e.preventDefault();$('shFriendQuery').focus();$('shFriendSearch').scrollIntoView({behavior:'smooth',block:'center'})});

$('shTheme').addEventListener('click',e=>{const b=e.target.closest('[data-sh-theme]');if(b&&$('shTheme').contains(b))applyTraderTheme(b.dataset.shTheme)});
$('shTheme').addEventListener('keydown',e=>{
 if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)||!e.target.closest('[data-sh-theme]'))return;
 e.preventDefault();const next=e.key==='Home'?'light':e.key==='End'?'dark':document.documentElement.dataset.traderTheme==='dark'?'light':'dark';
 applyTraderTheme(next);$('shTheme').querySelector('[data-sh-theme="'+next+'"]').focus();
});
$('shFriendSearch').addEventListener('submit',e=>{e.preventDefault();searchFriends()});
$('shFriendShortcut').addEventListener('click',e=>{e.preventDefault();$('shFriendQuery').focus();$('shFriendSearch').scrollIntoView({behavior:'smooth',block:'center'})});
// Keep theme consistent even before account API resolves.
try{applyTraderTheme(localStorage.getItem('mm1839-last-theme')==='dark'?'dark':'light',false)}catch{applyTraderTheme('light',false)}
// v18.4.3: combined search, with accessible results, bounded query and safe DOM text nodes.
let shSearchSeq=0,shSearchTimer=null;
function scheduleUnifiedSearch(){clearTimeout(shSearchTimer);const seq=++shSearchSeq,q=$('shSearch').value.trim(),host=$('shSearchResults');if(q.length<2){host.hidden=true;host.replaceChildren();return}shSearchTimer=setTimeout(async()=>{try{const d=await cApi('/search?q='+encodeURIComponent(q));if(seq!==shSearchSeq)return;host.replaceChildren();const makeSection=(title,items,build)=>{const wrap=el('div','sh-search-block');wrap.append(el('strong','sh-search-label',title));if(!items.length)wrap.append(el('p','sh-search-empty','Tidak ditemukan.'));for(const item of items)wrap.append(build(item));host.append(wrap)};
makeSection('Trader / Username',d.users||[],u=>{const row=el('div','sh-search-user'),a=el('a','sh-search-entry');a.href='/profil.html?user='+encodeURIComponent(u.username);a.append(el('strong','', nameOf1873(u)+(u.isSelf?' · akun Anda':'')),el('small','',(u.bio||'Lihat profil trader').slice(0,65)));window.SocialIdentity1875?.badge(a.querySelector('strong'),u);row.append(a);if(!u.isSelf){const b=el('button','sh-search-follow','Follow');b.type='button';b.addEventListener('click',async()=>{b.disabled=true;try{const st=await fapi('/status?user='+encodeURIComponent(u.username));await fapi('',st.isFollowing?'DELETE':'POST',{username:u.username});b.textContent=st.isFollowing?'Follow':'Mengikuti ✓';await refreshFriends()}catch(err){friendMsg(err.message,true)}finally{b.disabled=false}});fapi('/status?user='+encodeURIComponent(u.username)).then(st=>b.textContent=st.isFollowing?'Mengikuti ✓':'Follow').catch(()=>{});row.append(b)}return row});
makeSection('Grup Trader',d.groups||[],g=>{const a=el('a','sh-search-entry');a.href='/grup-trader.html?group='+encodeURIComponent(g.id);a.append(el('strong','', '☰ '+g.name),el('small','',g.members+' anggota · '+(g.description||'Grup publik').slice(0,70)));return a});
makeSection('Postingan',d.posts||[],p=>{const a=el('a','sh-search-entry');a.href='/beranda-trader.html?post='+encodeURIComponent(p.id);a.append(el('strong','', nameOf1873(p)),el('small','',p.body.slice(0,110)));return a});host.hidden=false;
}catch(e){if(seq===shSearchSeq){host.hidden=false;host.replaceChildren(el('p','sh-search-empty','Pencarian belum tersedia: '+e.message))}}},220)}
document.addEventListener('click',e=>{if(!e.target.closest('.sh-search-shell'))$('shSearchResults').hidden=true});
$('shSearch').addEventListener('keydown',e=>{if(e.key==='Escape'){$('shSearch').value='';state.search='';renderPosts();$('shSearchResults').hidden=true}});
boot();
})();
