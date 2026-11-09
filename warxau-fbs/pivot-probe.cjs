'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = '/persist/site-r1/MarketMarney-Railway-Staging/app';
const TARGETS = [
  ['server.js', ['async function marketOhlc','function marketOhlc','marketOhlc(',"p==='/api/market/ohlc'",'MARKET_OHLC','market_ohlc']],
  ['assets/pivot-desk-18110.js', ['pivot','ohlc','fetch(','/api/market/ohlc','/api/pivot-public']],
  ['assets/pivot-workspace-18111.js', ['pivot','ohlc','fetch(','/api/market/ohlc','/api/pivot-public']],
  ['assets/trader-market-desk.js', ['ohlc','fetch(','market','symbol','period']]
];

function clean(value) {
  return String(value)
    .replace(/[A-Za-z0-9_+\-/=]{72,}/g, '[redacted-long-token]')
    .replace(/\s+/g, ' ')
    .slice(0, 3000);
}

function emit(relative, terms) {
  const full = path.join(ROOT, relative);
  let text;
  try { text = fs.readFileSync(full, 'utf8'); }
  catch (error) {
    console.log('MM_OHLC_TARGET_MISSING ' + JSON.stringify({file:relative,error:String(error.message).slice(0,180)}));
    return;
  }
  console.log('MM_OHLC_TARGET_META ' + JSON.stringify({file:relative,bytes:Buffer.byteLength(text)}));
  let total = 0;
  const seen = new Set();
  for (const term of terms) {
    let cursor = 0;
    while (total < 28) {
      const index = text.indexOf(term, cursor);
      if (index < 0) break;
      cursor = index + term.length;
      const snippet = clean(text.slice(Math.max(0,index-1800),Math.min(text.length,index+term.length+3600)));
      if (seen.has(snippet)) continue;
      seen.add(snippet); total++;
      console.log('MM_OHLC_TARGET_SNIP ' + JSON.stringify({file:relative,term,part:total,snippet}));
    }
  }
  if (!total && text.length <= 22000) {
    const size=6000;
    for(let offset=0,part=1;offset<text.length;offset+=size,part++){
      console.log('MM_OHLC_TARGET_BODY '+JSON.stringify({file:relative,part,text:clean(text.slice(offset,offset+size))}));
    }
  }
}

function run() {
  if (process.env.MM_PIVOT_PROBE !== '1') return;
  for (const [file,terms] of TARGETS) emit(file,terms);
  console.log('MM_OHLC_PROBE_DONE ' + JSON.stringify({targets:TARGETS.length}));
}

setTimeout(run, 1000).unref();
