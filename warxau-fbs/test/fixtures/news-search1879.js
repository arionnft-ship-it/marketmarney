/* MarketMarney 18.7.9 — local search over published articles, without remote requests. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MMNewsSearch1879 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const MAX_QUERY = 180;
  const entities = {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',ndash:'–',mdash:'—',rsquo:'’',lsquo:'‘',ldquo:'“',rdquo:'”',hellip:'…',eacute:'é',Eacute:'É'};
  function text(value) {
    if (Array.isArray(value)) return value.map(text).join(' ');
    return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  }
  function plainHTML(value) {
    // Extract visible words only; never execute or attach article HTML to the DOM.
    return text(value).replace(/<!--[\s\S]*?-->/g,' ')
      .replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,' ')
      .replace(/<[^>]*>/g,' ')
      .replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, (all,key) => {
        if (key[0] !== '#') return entities[key] ?? ' ';
        const n = key[1].toLowerCase() === 'x' ? parseInt(key.slice(2),16) : parseInt(key.slice(1),10);
        return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : ' ';
      });
  }
  function normalize(value) {
    return text(value).normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase('id')
      .replace(/\b(xau|eur|gbp|usd|btc|eth|jpy|aud|nzd|cad|chf)\s*[/_-]\s*(usd|jpy|chf|cad|eur|gbp|aud|nzd)\b/g,'$1$2')
      .replace(/\b(xau|eur|gbp|usd|btc|eth|aud|nzd)\s+(usd|jpy|chf|cad)\b/g,'$1$2')
      .replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
  }
  const aliases = [
    ['emas','gold','xau','xauusd'], ['bitcoin','btc','btcusd'], ['ethereum','eth','ethusd'],
    ['kripto','crypto','cryptocurrency','cryptocurrencies'], ['forex','valas'],
    ['saham','stock','stocks','ekuitas','equity','equities'], ['fed','the fed','federal reserve']
  ];
  const aliasMap = new Map();
  aliases.forEach(group => group.forEach(word => aliasMap.set(word,group)));
  const phrases = [...aliasMap.keys()].filter(w => w.includes(' ')).sort((a,b)=>b.length-a.length);
  function terms(query) {
    let q = normalize(text(query).slice(0,MAX_QUERY));
    // Canonicalise recognised phrases before splitting; other words may match in any order.
    phrases.forEach(phrase => {q = (' '+q+' ').split(' '+phrase+' ').join(' '+aliasMap.get(phrase)[0]+' ').trim();});
    const seen = new Set();
    return q.split(' ').filter(Boolean).map(word => {
      const alternatives = aliasMap.get(word) || [word];
      return {word,alternatives,exact:aliasMap.has(word),key:alternatives.join('|')};
    }).filter(t => {if(seen.has(t.key))return false;seen.add(t.key);return true;});
  }
  const BASE_CATEGORIES = ['SEMUA','FOREX','SAHAM','EMAS','CRYPTO','EKONOMI'];
  function categoryName(value) {
    const cat = text(value).trim().toLocaleUpperCase('id');
    return ({GOLD:'EMAS',XAUUSD:'EMAS','XAU/USD':'EMAS',STOCK:'SAHAM',STOCKS:'SAHAM',EQUITIES:'SAHAM',VALAS:'FOREX',FX:'FOREX',KRIPTO:'CRYPTO'})[cat] || cat;
  }
  function category(article) {return categoryName(article.cat || article.category);}
  function categories(articles) {
    return [...new Set([...BASE_CATEGORIES, ...(Array.isArray(articles)?articles:[]).filter(a=>a&&(!a.status||a.status==='published')).map(category).filter(Boolean)])];
  }
  function legacyGold(article) {
    // Keep the stored category unchanged. Older releases classified gold under FOREX.
    return category(article)==='FOREX' && /\b(?:emas|gold|xau[\s\/_-]*usd|xau)\b/i.test(text([article.title,article.titleEN,article.desc,article.summary]));
  }
  function dateValue(article) {
    const raw=text(article.publishedAt || article.published_at || article.createdAt || article.created_at || article.date);
    const direct=Date.parse(raw);if(Number.isFinite(direct))return direct;
    const m=raw.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des)[a-z]*\s+(\d{4})/i);
    if(!m)return 0;
    const month=['jan','feb','mar','apr','mei','jun','jul','agu','sep','okt','nov','des'].indexOf(m[2].slice(0,3).toLowerCase());
    return Date.UTC(+m[3],month,+m[1]);
  }
  function createIndex(articles) {
    return (Array.isArray(articles)?articles:[]).filter(a => a && typeof a==='object' && (!a.status || a.status==='published')).map((article,order) => ({
      article,order,category:category(article),legacyGold:legacyGold(article),date:dateValue(article),
      fields:[
        {value:normalize([article.title,article.titleEN]),weight:8},
        {value:normalize([article.desc,article.descEN,article.summary,article.summaryEN]),weight:4},
        {value:normalize([article.cat,article.category,article.tags,article.keywords,article.pair,article.pairs,article.symbol,article.symbols,article.instrument,article.instruments,article.source,article.sourceName,article.source_name,article.sourceUrl,article.source_url,article.author,article.authorName]),weight:3},
        {value:normalize(plainHTML([article.body,article.bodyHtml,article.content,article.contentHtml,article.bodyEN,article.contentEN])),weight:1}
      ]
    }));
  }
  function matches(field,term) {
    return term.alternatives.some(word => (term.exact || word.length<3) ? (' '+field+' ').includes(' '+word+' ') : field.includes(word));
  }
  function search(index,query,options={}) {
    const q=normalize(text(query).slice(0,MAX_QUERY));
    const groups=terms(query);const cat=categoryName(options.category || 'SEMUA');
    const saved=new Set((options.savedIds || []).map(String));const results=[];
    for(const entry of index) {
      if(cat!=='SEMUA' && entry.category!==cat && !(cat==='EMAS' && entry.legacyGold))continue;
      if(options.savedOnly && !saved.has(String(entry.article.id)))continue;
      let score=0,ok=true;
      for(const group of groups) {
        let best=0;
        for(const field of entry.fields)if(matches(field.value,group))best=Math.max(best,field.weight);
        if(!best){ok=false;break;}score+=best;
      }
      if(!ok)continue;
      if(q && entry.fields[0].value.includes(q))score+=12;
      results.push({entry,score});
    }
    const sort=options.sort || 'relevance';
    results.sort((a,b) => {
      if(sort==='title')return text(a.entry.article.title).localeCompare(text(b.entry.article.title),'id') || a.entry.order-b.entry.order;
      if(sort==='oldest')return a.entry.date-b.entry.date || a.entry.order-b.entry.order;
      if(sort==='relevance' && groups.length && a.score!==b.score)return b.score-a.score;
      return b.entry.date-a.entry.date || a.entry.order-b.entry.order;
    });
    return results.map(r=>r.entry.article);
  }
  return Object.freeze({MAX_QUERY,normalize,plainHTML,terms,createIndex,search,categories,categoryName});
});
