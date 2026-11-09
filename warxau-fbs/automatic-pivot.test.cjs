'use strict';

const assert = require('node:assert/strict');
const pivot = require('./automatic-pivot.cjs');

assert.equal(pivot.VERSION,'20261109-auto-pivot-v1');
assert.equal(pivot.canonicalSymbol('FX:EURUSD').canonical,'OANDA:EURUSD');
assert.equal(pivot.canonicalSymbol('OANDA:XAUUSD').canonical,'OANDA:XAUUSD');
assert.throws(()=>pivot.canonicalSymbol('UNKNOWN:PAIR'),/belum didukung/);

const methods = pivot.computeMethods({high:10,low:4,close:7,open:6});
assert.equal(methods.classic.pivot,7);
assert.equal(methods.classic.s1,4);
assert.equal(methods.classic.r1,10);
assert.equal(methods.fibonacci.r3,13);
assert.ok(Number.isFinite(methods.demark.pivot));

const record = pivot.buildAutomaticRecord({
  high:4100,
  low:4000,
  close:4060,
  openPrevious:4025,
  providerSymbol:'XAU/USD',
  barStart:'2026-11-08T00:00:00Z',
  timezone:'UTC',
  source:'Fixture provider',
  retrievedAt:'2026-11-09T00:00:00Z',
  note:'Completed candle only'
},'OANDA:XAUUSD','OANDA:XAUUSD','Daily');
assert.equal(record.automatic,true);
assert.equal(record.candleDate,'2026-11-08');
assert.equal(record.levels.pivot,(4100+4000+4060)/3);
assert.equal(record.ohlc.open,4025);
assert.match(record.source,/Fixture/);
assert.match(pivot.CLIENT,/\/api\/pivot-auto/);
assert.match(pivot.CLIENT,/Perbarui Pivot otomatis/);
assert.match(pivot.CLIENT,/candle selesai sebelumnya/);

function response(){
  const headers=new Map(),chunks=[];
  return {
    statusCode:200,headersSent:false,chunks,
    setHeader(k,v){headers.set(String(k).toLowerCase(),v)},
    getHeader(k){return headers.get(String(k).toLowerCase())},
    removeHeader(k){headers.delete(String(k).toLowerCase())},
    writeHead(status,values){this.statusCode=status;if(values)for(const [k,v]of Object.entries(values))this.setHeader(k,v);this.headersSent=true;return this},
    write(chunk){chunks.push(Buffer.from(chunk));return true},
    end(chunk){if(chunk!=null)chunks.push(Buffer.from(chunk));this.ended=true;return this},
    body(){return Buffer.concat(chunks).toString('utf8')}
  };
}

{
  const req={method:'GET',url:pivot.ASSET_PATH,headers:{}};
  const res=response();
  assert.equal(pivot.sendAsset(req,res),true);
  assert.equal(res.statusCode,200);
  assert.match(res.getHeader('content-type'),/javascript/);
  assert.match(res.body(),/MM_AUTOMATIC_PIVOT|mm-automatic-pivot|MarketMarney/i);
}

{
  const req={method:'GET',url:'/index.html',headers:{}};
  const res=response();
  res.headersSent=false;
  pivot.wrapIndexHtml(req,res);
  res.setHeader('content-type','text/html; charset=utf-8');
  res.writeHead(200);
  res.end('<!doctype html><html><body><p>PIVOT POINT / ADMIN PUBLISHED</p><p>Dikelola admin</p><p>Level disediakan admin</p></body></html>');
  const body=res.body();
  assert.match(body,/PIVOT POINT \/ OTOMATIS/);
  assert.match(body,/OHLC otomatis/);
  assert.match(body,/Dihitung dari candle selesai sebelumnya/);
  assert.match(body,/mm-automatic-pivot\.js/);
  assert.equal(res.getHeader('x-marketmarney-automatic-pivot'),pivot.VERSION);
}

console.log(JSON.stringify({ok:true,version:pivot.VERSION,symbols:pivot.CANONICAL_SYMBOLS.size,periods:pivot.PERIODS.size}));
