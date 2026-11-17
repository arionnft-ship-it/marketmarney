'use strict';
// Opt-in, public read-only terminal view. Existing MarketMarney SPA and user
// accounts remain untouched; UI uses current MarketMarney public endpoints.
const fs=require('node:fs'),path=require('node:path');
const VERSION='marney-terminal-20261118-v1';
const HOME='/terminal';
const FILES=[
 ['/terminal','terminal.html','text/html; charset=utf-8'],
 ['/terminal/','terminal.html','text/html; charset=utf-8'],
 ['/assets/mm-terminal-v1.css','terminal.css','text/css; charset=utf-8'],
 ['/assets/mm-terminal-v1.js','terminal.js','text/javascript; charset=utf-8'],
 ['/assets/mm-terminal-entry-v1.css','terminal-entry.css','text/css; charset=utf-8'],
 ['/assets/mm-terminal-entry-v1.js','terminal-entry.js','text/javascript; charset=utf-8']
];
function assets(){
 return new Map(FILES.map(([url,file,mime])=>[
  url,{body:fs.readFileSync(path.join(__dirname,'terminal',file)),mime}
 ]));
}
function injectHtml(html,pathname){
 if(pathname!=='/'&&pathname!=='/index.html')return html;
 if(typeof html!=='string'||!/<\/head\s*>/i.test(html)||!/<html\b/i.test(html))return html;
 if(html.includes('data-marney-terminal-entry="'+VERSION+'"'))return html;
 const tags='<link rel="stylesheet" href="/assets/mm-terminal-entry-v1.css?v='+VERSION+'" data-marney-terminal-entry="'+VERSION+'">'+
  '<script defer src="/assets/mm-terminal-entry-v1.js?v='+VERSION+'"></script>';
 return html.replace(/<\/head\s*>/i,tags+'</head>');
}
module.exports={VERSION,HOME,FILES,assets,injectHtml};
