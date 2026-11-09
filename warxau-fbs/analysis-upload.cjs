'use strict';
const fs=require('node:fs'),path=require('node:path');
const VERSION='20261110-v1';
const sources=[
 ['/assets/mm-analysis-admin-v1.js','analysis-upload-admin.js','text/javascript; charset=utf-8'],
 ['/assets/mm-analysis-public-v1.js','analysis-upload-public.js','text/javascript; charset=utf-8'],
 ['/assets/mm-analysis-v1.css','analysis-upload.css','text/css; charset=utf-8']
];
function assets(dir=__dirname){
 return new Map(sources.map(([url,name,mime])=>[url,{body:fs.readFileSync(path.join(dir,name)),mime}]));
}
function injectHtml(html,pathname){
 if(typeof html!=='string'||!/<\/head\s*>/i.test(html)||!/<\/html\s*>/i.test(html))return html;
 const isAdmin=pathname==='/admin.html',isPublic=pathname==='/'||pathname==='/index.html';
 if(!isAdmin&&!isPublic)return html;
 const mark=isAdmin?'data-mm-analysis-admin':'data-mm-analysis-public';
 if(html.includes(mark+'="'+VERSION+'"'))return html;
 const script=isAdmin?'/assets/mm-analysis-admin-v1.js':'/assets/mm-analysis-public-v1.js';
 const injection='<link rel="stylesheet" href="/assets/mm-analysis-v1.css?v='+VERSION+'" '+mark+'="'+VERSION+'"><script defer src="'+script+'?v='+VERSION+'"></script>';
 return html.replace(/<\/head\s*>/i,injection+'</head>');
}
module.exports={VERSION,sources,assets,injectHtml};
