'use strict';
// Exact-match, public, read-only Google site ownership challenge.
// No cookies, sessions, user data, tracking, or mounted-volume changes.
const fs=require('node:fs');
const path=require('node:path');
const FILENAME='google8fcf862d11683012.html';
const ROUTE='/'+FILENAME;
const BODY=fs.readFileSync(path.join(__dirname,FILENAME));
function handle(req,res){
  const requested=String(req.url||'').split('?')[0];
  if(requested!==ROUTE)return false;
  if(req.method!=='GET'&&req.method!=='HEAD'){
    res.writeHead(405,{'Allow':'GET, HEAD','Cache-Control':'no-store'});
    res.end();
    return true;
  }
  res.writeHead(200,{
    'Content-Type':'text/html; charset=utf-8',
    'Cache-Control':'public, max-age=300',
    'X-Content-Type-Options':'nosniff',
    'Content-Length':BODY.length
  });
  res.end(req.method==='HEAD'?undefined:BODY);
  return true;
}
module.exports={FILENAME,ROUTE,BODY,handle};
