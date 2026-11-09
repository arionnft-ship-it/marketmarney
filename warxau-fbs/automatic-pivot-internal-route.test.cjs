'use strict';

const assert = require('node:assert/strict');
const route = require('./automatic-pivot-internal-route.cjs');

const source = {
  hostname:'127.0.0.1',
  port:8080,
  path:'/api/market/ohlc?symbol=OANDA%3AEURUSD&period=Daily',
  method:'GET',
  headers:{
    Host:'marketmarney.com',
    Accept:'application/json',
    'User-Agent':'MarketMarney-Automatic-Pivot/20261109-auto-pivot-v1',
    'X-Forwarded-For':'203.0.113.1'
  }
};
assert.equal(route.shouldRewrite(source),true);
const rewritten = route.rewriteOptions(source);
assert.equal(rewritten.hostname,'127.0.0.1');
assert.equal(rewritten.port,route.INTERNAL_PORT);
assert.equal(rewritten.headers.Host,'marketmarney.com');
assert.equal(rewritten.headers['X-Forwarded-Proto'],'https');
assert.equal(rewritten.headers['X-Real-IP'],'127.0.0.1');
assert.equal(rewritten.headers['X-Forwarded-For'],undefined);
assert.equal(source.port,8080);

assert.equal(route.shouldRewrite({...source,path:'/api/content'}),false);
assert.equal(route.shouldRewrite({...source,headers:{'User-Agent':'Other-Agent'}}),false);
assert.equal(route.shouldRewrite({...source,hostname:'marketmarney.com'}),false);

console.log(JSON.stringify({ok:true,version:route.VERSION,internalPort:route.INTERNAL_PORT,host:'marketmarney.com'}));
