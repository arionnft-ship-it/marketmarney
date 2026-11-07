'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const RELEASE='sidebar3d-20261108-v1';
const assets=new Map([['/assets/marney-sidebar3d-v1.css',{file:'style.css',type:'text/css; charset=utf-8'}],['/assets/marney-sidebar3d-v1.js',{file:'client.js',type:'text/javascript; charset=utf-8'}]]);
for(const a of assets.values()){a.body=fs.readFileSync(path.join(__dirname,a.file));a.etag='"'+crypto.createHash('sha256').update(a.body).digest('hex')+'"';}
function enhance(html){
 if(typeof html!=='string'||!/<aside\b(?=[^>]*\bid=["']sidebar["'])[^>]*>/i.test(html)||!/<\/head\s*>/i.test(html))return html;
 if(html.includes('data-mm-sidebar3d-release="'+RELEASE+'"'))return html;
 html=html.replace(/(<aside\b(?=[^>]*\bid=["']sidebar["'])[^>]*)(>)/i,'$1 data-mm3d="'+RELEASE+'"$2');
 const motion='<style data-mm3d-accessibility>@media(prefers-reduced-motion:reduce){html #sidebar[data-mm3d] .navbtn,html #sidebar[data-mm3d] .social-link{transition:none!important;animation:none!important;}}</style>';
 const inject='<link rel="stylesheet" href="/assets/marney-sidebar3d-v1.css" data-mm-sidebar3d-release="'+RELEASE+'">'+motion+'<script defer src="/assets/marney-sidebar3d-v1.js"></script>';
 return html.replace(/<\/head\s*>/i,inject+'</head>');
}
function handle(req,res){const p=String(req.url||'').split('?')[0];let asset=assets.get(p);if(!asset)return false;
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD','Cache-Control':'no-store'});res.end();return true;}
 const h={'Content-Type':asset.type,'Cache-Control':'public, max-age=0, must-revalidate','ETag':asset.etag,'X-Content-Type-Options':'nosniff','X-Marney-Sidebar':RELEASE};
 if(req.headers['if-none-match']===asset.etag){res.writeHead(304,h);res.end();return true;}
 h['Content-Length']=asset.body.length;res.writeHead(200,h);res.end(req.method==='HEAD'?undefined:asset.body);return true;
}
module.exports={enhance,handle,RELEASE};
