'use strict';
const fs=require('node:fs'),path=require('node:path');
const VERSION='20261110-v2';
const sources=[
 ['/assets/mm-analysis-admin-v1.js','analysis-upload-admin.js','text/javascript; charset=utf-8'],
 ['/assets/mm-analysis-public-v1.js','analysis-upload-public.js','text/javascript; charset=utf-8'],
 ['/assets/mm-analysis-v1.css','analysis-upload.css','text/css; charset=utf-8'],
 ['/assets/mm-analysis-article-v1.js','analysis-article.js','text/javascript; charset=utf-8'],
 ['/assets/mm-analysis-article-v1.css','analysis-article.css','text/css; charset=utf-8']
];
function assets(dir=__dirname){
 return new Map(sources.map(([url,name,mime])=>[url,{body:fs.readFileSync(path.join(dir,name)),mime}]));
}
function injectHtml(html,pathname){
 if(typeof html!=='string'||!/<\/head\s*>/i.test(html)||!/<\/html\s*>/i.test(html))return html;
 const isAdmin=pathname==='/admin.html',isPublic=pathname==='/'||pathname==='/index.html';
 const article=/^\/berita\/mm-analysis-[a-f0-9-]{32,36}(?:\/[a-z0-9-]*)?\/?$/i.test(pathname);
 if(!isAdmin&&!isPublic&&!article)return html;
 if(article){
  const v='20261110-article-v1';
  if(html.includes('data-mm-analysis-article="'+v+'"'))return html;
  const tags='<link rel="stylesheet" href="/assets/mm-analysis-article-v1.css?v='+v+'" data-mm-analysis-article="'+v+'"><script defer src="/assets/mm-analysis-article-v1.js?v='+v+'"></script>';
  return html.replace(/<\/head\s*>/i,tags+'</head>');
 }
 const mark=isAdmin?'data-mm-analysis-admin':'data-mm-analysis-public';
 if(html.includes(mark+'="'+VERSION+'"'))return html;
 const script=isAdmin?'/assets/mm-analysis-admin-v1.js':'/assets/mm-analysis-public-v1.js';
 const injection='<link rel="stylesheet" href="/assets/mm-analysis-v1.css?v='+VERSION+'" '+mark+'="'+VERSION+'"><script defer src="'+script+'?v='+VERSION+'"></script>';
 return html.replace(/<\/head\s*>/i,injection+'</head>');
}
module.exports={VERSION,sources,assets,injectHtml};
