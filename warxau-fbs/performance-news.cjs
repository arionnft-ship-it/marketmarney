'use strict';

// A response-only change to the known public homepage bundle. The installed
// website and its data remain on the persistent volume. If the bundle changes,
// return it unchanged instead of applying only half of this coordinated patch.
const MARKER = 'mm-performance-news-v1';
/** Public news listing: exclude technical-analysis publications only.
 *  The /api/content response remains untouched; the dedicated Analisa Market
 *  widget and canonical article links continue using the original data. */
function isNewsListingArticle(a) {
  if (!a || typeof a !== 'object' || a.status !== 'published' || a.id == null) return false;
  return String(a.tipe || '').trim().toLowerCase() !== 'analysis'
    && !/^mm-analysis-/i.test(String(a.id));
}
const NEWS_LISTING_FILTER = 'const mmPerfIsNewsListingArticle = ' + isNewsListingArticle.toString() + ';';


const OLD_BOOT = `(async()=>{try{let mm1811Online=false;try{const r=await fetch('/api/content',{cache:'no-store'});if(r.ok){const d=await r.json();localStorage.setItem('mm_pro_articles',JSON.stringify(d.articles));localStorage.setItem('mm_pro_forums',JSON.stringify(d.forums));localStorage.setItem('mm_tv_videos_v1',JSON.stringify(d.videos));window.mm1816CommunityLinks=d.communityLinks||{};window.mm1816PivotLevels=d.publishedPivots||{};mm1811Online=true;}}catch(e){console.warn('MarketMarney: API konten tidak tersedia, menggunakan cache lokal bila ada.',e);}`;

const OLD_OFFLINE = `if(!mm1811Online){const notice=document.createElement('div');notice.className='mm1811-offline';notice.setAttribute('role','status');notice.textContent='Koneksi API berita belum tersedia. Konten yang terlihat mungkin berasal dari penyimpanan lokal dan belum terbaru.';document.body.prepend(notice)}`;

const OLD_ROUTE = `function restoreArticleRoute(){const m=location.hash.match(/^#artikel\\/(.+)$/);if(m){let id;try{id=decodeURIComponent(m[1])}catch{return false}const a=articles.find(x=>String(x.id)===id);if(a){selected=a;page='Artikel';render();return true}}return false}`;

const NEW_ROUTE = `function restoreArticleRoute(){const m=location.hash.match(/^#artikel\\/(.+)$/);if(!m)return false;let id;try{id=decodeURIComponent(m[1])}catch{return false}selected=articles.find(x=>String(x.id)===id)||null;page='Artikel';render();return true}`;

const NEW_BOOT = String.raw`(()=>{try{
/* mm-performance-news-v1: the navigation does not wait for /api/content. */
let mm1811Online=false,mmPerfNewsState='loading',mmPerfVideos=[],mmPerfContentRequest=null;
const mmPerfReadingCache=new WeakMap();
${NEWS_LISTING_FILTER}
window.mm1816CommunityLinks={};window.mm1816PivotLevels={};
function mmPerfContentPlaceholder(kind){
 const loading=mmPerfNewsState==='loading',failed=mmPerfNewsState==='error';
 const message=loading?(kind==='video'?'Memuat video…':'Memuat berita terbaru…'):failed?'Konten belum dapat dimuat. Periksa koneksi lalu coba lagi.':(kind==='video'?'Belum ada video yang diterbitkan.':'Belum ada berita yang diterbitkan.');
 const retry=failed?'<button type="button" class="button outline" data-mm-perf-retry>Coba lagi</button>':'';
 return '<div class="'+(kind==='headline'?'panel headline-carousel':'mm84-empty')+'" role="status" aria-live="polite" aria-busy="'+String(loading)+'"><p>'+message+'</p>'+retry+'</div>';
}
function mmPerfNewsEmpty(){return mmPerfNewsState==='ready'?'<div class="mm84-empty">Belum ada berita yang sesuai. Coba kata kunci atau kategori lain.</div>':mmPerfContentPlaceholder('news');}
function mmPerfArticlePlaceholder(){
 const heading=mmPerfNewsState==='ready'?'Artikel tidak tersedia':'Artikel MarketMarney';
 const message=mmPerfNewsState==='ready'?'<p class="muted">Artikel ini tidak tersedia untuk publik.</p>':mmPerfContentPlaceholder('article');
 return '<section class="article"><button type="button" class="button outline" data-page="Berita">← KEMBALI KE BERITA</button><h1>'+heading+'</h1>'+message+'</section>';
}
function mmPerfRefreshContentView(){
 const active=document.activeElement,keepSearch=page==='Berita'&&active&&active.id==='search';
 const selection=keepSearch?[active.selectionStart,active.selectionEnd]:null;
 if(!restoreArticleRoute()&&['Beranda','Berita','Artikel','MarketMarney TV','Komunitas','Analisa'].includes(page))render();
 if(keepSearch){const search=document.getElementById('search');if(search){search.focus({preventScroll:true});if(selection&&Number.isInteger(selection[0]))try{search.setSelectionRange(selection[0],selection[1])}catch{}}}
}
function mmPerfLoadContent(){
 if(mmPerfContentRequest)return mmPerfContentRequest;
 if(mmPerfNewsState!=='loading'){mmPerfNewsState='loading';mmPerfRefreshContentView();}
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),8000);
 mmPerfContentRequest=(async()=>{
  try{
   const response=await fetch('/api/content',{cache:'no-store',credentials:'omit',signal:controller.signal});
   if(!response.ok)throw new Error('Public content request failed');
   const data=await response.json();
   if(!data||!Array.isArray(data.articles))throw new Error('Invalid public content response');
   // Only this unauthenticated public response is authoritative. In particular,
   // an old localStorage value written by the admin cannot expose a draft.
   const published=data.articles.filter(mmPerfIsNewsListingArticle);
   const nextIndex=window.MMNewsSearch1879.createIndex(published);
   articles=published;newsSearchIndex=nextIndex;
   if(Array.isArray(data.forums))forums=data.forums;
   mmPerfVideos=Array.isArray(data.videos)?data.videos.filter(v=>v&&v.status==='published'):[];
   window.mm1816CommunityLinks=data.communityLinks&&typeof data.communityLinks==='object'?data.communityLinks:{};
   window.mm1816PivotLevels=data.publishedPivots&&typeof data.publishedPivots==='object'?data.publishedPivots:{};
   // Retain the established cache contract for other public features, but do
   // not depend on storage being available or read it during public startup.
   try{localStorage.setItem('mm_pro_articles',JSON.stringify(articles));localStorage.setItem('mm_pro_forums',JSON.stringify(forums));localStorage.setItem('mm_tv_videos_v1',JSON.stringify(mmPerfVideos));}catch{}
   mm1811Online=true;mmPerfNewsState='ready';
  }catch(error){mm1811Online=false;mmPerfNewsState='error';console.warn('MarketMarney: konten publik belum dapat dimuat.');}
  finally{clearTimeout(timeout);mmPerfContentRequest=null;}
  mmPerfRefreshContentView();
 })();
 return mmPerfContentRequest;
}
document.addEventListener('click',event=>{if(event.target?.closest?.('[data-mm-perf-retry]')){event.preventDefault();void mmPerfLoadContent();}});
window.addEventListener('online',()=>{if(mmPerfNewsState==='error')void mmPerfLoadContent();});
`;

// Safely render HTML paragraphs from API-published articles and preserve plain text.
const ARTICLE_READER = String.raw`function mmPerfArticleBody(article){
 const rich=String(article.bodyHtml||'').trim();
 if(rich)return safeArticleHtml(rich);
 const raw=String(article.body||article.desc||'').trim();
 if(!raw)return '';
 const isHtml=/<(?:p|div|h[2-6]|ul|ol|li|blockquote|br)\b[^>]*>/i.test(raw);
 let html='';
 if(isHtml){
  html=safeArticleHtml(raw);
 }else{
  html=raw.split(/\n\s*\n/).map(part=>part.trim()).filter(Boolean)
   .map(part=>'<p>'+esc(part).replace(/\r?\n/g,'<br>')+'</p>').join('');
 }
 if(!isHtml)return html;
 const wrapper=document.createElement('div');
 wrapper.innerHTML=html;
 for(const paragraph of wrapper.querySelectorAll('p')){
  const text=paragraph.textContent.trim();
  if(paragraph.children.length===0&&text.length<=100&&
     (/^kesimpulan$/i.test(text)||/^(?:apa|mengapa|bagaimana|kapan|siapa|dampak|prospek)\b.{4,90}\?$/i.test(text))){
   const heading=document.createElement('h2');heading.textContent=text;
   paragraph.replaceWith(heading);
  }
 }
 return wrapper.innerHTML;
}`;

const IMAGE_FUNCTIONS = String.raw`function mmPerfImagePath(value,width){
 let path=String(value||'');
 if(path.startsWith('https://marketmarney.com/media/'))path=path.slice('https://marketmarney.com'.length);
 const match=path.match(/^\/media\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(?:png|jpe?g|webp))$/i);
 return match?'/assets/news-thumb-v1/'+(width===1280?1280:640)+'/'+match[1]:String(value||'');
}
function img(a){const path=mmPerfImagePath(a.img,1280);return path.startsWith('data:image/')||/^https:\/\//.test(path)||/^\/(?:media|assets\/news-thumb-v1\/(?:640|1280))\/[a-zA-Z0-9._-]+$/.test(path)?'url(&quot;'+esc(path).replace(/"/g,'%22')+'&quot;)':backgrounds[a.img]||backgrounds.stocks;}
function imageTag(a,mode){
 const path=String(a.img||'');
 if(!/^(\/media\/[a-zA-Z0-9._-]+|https:\/\/[^\s"'<>]+|data:image\/(png|jpeg|jpg|webp|gif);base64,[a-zA-Z0-9+/=]+)$/.test(path))return '';
 const large=mode==='article',small=mmPerfImagePath(path,640),big=mmPerfImagePath(path,1280),optimized=small!==path;
 const src=large?big:small;
 const responsive=optimized?' srcset="'+esc(small)+' 640w, '+esc(big)+' 1280w" sizes="'+(large?'(max-width: 750px) calc(100vw - 40px), 900px':'(max-width: 750px) calc(100vw - 40px), 360px')+'"':'';
 const fallback=optimized?' data-mm-original-src="'+esc(path)+'" onerror="if(!this.dataset.mmOriginalTried){this.dataset.mmOriginalTried=\'1\';this.removeAttribute(\'srcset\');this.src=this.dataset.mmOriginalSrc}else{this.style.display=\'none\'}"':' onerror="this.style.display=\'none\'"';
 return '<img class="mm-article-image" src="'+esc(src)+'"'+responsive+' alt="Foto: '+esc(a.title||'Artikel MarketMarney')+'" loading="'+(large?'eager':'lazy')+'" decoding="async"'+(large?' fetchpriority="high"':'')+fallback+'>';
}`;

function once(source, before, after) {
  const at = source.indexOf(before);
  if (at === -1 || source.indexOf(before, at + before.length) !== -1) throw new Error('Homepage contract mismatch');
  return source.slice(0, at) + after + source.slice(at + before.length);
}

function transformScript(original) {
  let source = once(original, OLD_BOOT, NEW_BOOT);
  source = once(source, "let articles=JSON.parse(localStorage.getItem('mm_pro_articles')||'null')||defaultNews,forums=JSON.parse(localStorage.getItem('mm_pro_forums')||'null')||", 'let articles=[],forums=');
  source = once(source, 'const newsSearchIndex=window.MMNewsSearch1879.createIndex(articles);', 'let newsSearchIndex=window.MMNewsSearch1879.createIndex(articles);');
  source = once(source, 'selected.bodyHtml?safeArticleHtml(selected.bodyHtml):esc(selected.body||selected.desc)', 'mmPerfArticleBody(selected)');
  const imageStart = source.indexOf('function img(a){');
  const imageEnd = source.indexOf('let mm95ArticleLang=', imageStart);
  if (imageStart === -1 || imageEnd === -1 || !source.slice(imageStart, imageEnd).includes('function imageTag(a){')) throw new Error('Homepage image contract mismatch');
  source = source.slice(0, imageStart) + IMAGE_FUNCTIONS + source.slice(imageEnd);
  source = once(source, 'function readingMinutes(a){const raw=', ARTICLE_READER+'\nfunction readingMinutes(a){if(mmPerfReadingCache.has(a))return mmPerfReadingCache.get(a);const raw=');
  source = once(source, 'return Math.max(1,Math.ceil(words/220))}function card(a)', 'const minutes=Math.max(1,Math.ceil(words/220));mmPerfReadingCache.set(a,minutes);return minutes}function card(a)');
  source = once(source, '<div class="cardimg" style="background-image:${img(a)}">${imageTag(a)}', '<div class="cardimg" style="background-image:${mm951HasImage(a)?\'none\':img(a)}">${imageTag(a)}');
  source = once(source, '<div class="mm90-photo" style="background-image:${img(story)}">${imageTag(story)}', '<div class="mm90-photo" style="background-image:${mm951HasImage(story)?\'none\':img(story)}">${imageTag(story)}');
  source = once(source, '<div class="cardimg" style="height:330px;background-image:${img(selected)}">${imageTag(selected)}', '<div class="cardimg" style="height:330px;background-image:${mm951HasImage(selected)?\'none\':img(selected)}">${imageTag(selected,\'article\')}');
  source = once(source, '<div class="news-set">${articles.map(card).join(\'\')}</div><div class="news-set" aria-hidden="true">${articles.map(card).join(\'\')}</div>', '<div class="news-set">${articles.slice(0,6).map(card).join(\'\')}</div>');
  source = once(source, '</div></div>`:\'\'}<div class="sectionhead"><div><div class="eyebrow">02 / THE NEWSWIRE', '</div></div>`:mmPerfContentPlaceholder(\'headline\')}<div class="sectionhead"><div><div class="eyebrow">02 / THE NEWSWIRE');
  source = once(source, "const tvList=()=>{try{return JSON.parse(localStorage.getItem(TV_KEY)||'[]')}catch{return []}};", 'const tvList=()=>mmPerfVideos;');
  source = once(source, "if(page==='Artikel'&&selected)h=", "if(page==='Artikel'&&!selected)h=mmPerfArticlePlaceholder();if(page==='Artikel'&&selected)h=");
  source = once(source, "$('#newsList').innerHTML=filtered.length?filtered.slice(0,newsVisibleLimit).map(card).join(''):'<div class=\"mm84-empty\">Belum ada berita yang sesuai. Coba kata kunci atau kategori lain.</div>';", "$('#newsList').setAttribute('aria-busy',String(mmPerfNewsState==='loading'));$('#newsList').innerHTML=filtered.length?filtered.slice(0,newsVisibleLimit).map(card).join(''):mmPerfNewsEmpty();");
  source = once(source, "$('#newsCount').textContent=(filtered.length?", "$('#newsCount').textContent=(mmPerfNewsState==='loading'?'Memuat berita…':mmPerfNewsState==='error'?'Berita belum dapat dimuat':filtered.length?");
  source = once(source, OLD_ROUTE, NEW_ROUTE);
  source = once(source, OLD_OFFLINE, 'void mmPerfLoadContent();');
  return source;
}

function transformHomeHtml(html) {
  if (typeof html !== 'string' || html.includes(MARKER)) return html;
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)];
  const matches = scripts.filter(match => match[1].includes(OLD_BOOT));
  if (matches.length !== 1) return html;
  const match = matches[0];
  try {
    const revised = transformScript(match[1]);
    const start = match.index + match[0].indexOf('>') + 1;
    return html.slice(0, start) + revised + html.slice(start + match[1].length);
  } catch {
    return html;
  }
}

module.exports = { transformHomeHtml, MARKER, isNewsListingArticle, NEWS_LISTING_FILTER };
