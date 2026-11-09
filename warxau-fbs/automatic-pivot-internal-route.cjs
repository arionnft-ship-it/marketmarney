'use strict';

const http = require('node:http');

const VERSION = '20261109-auto-pivot-internal-v1';
const INTERNAL_PORT = Number(process.env.MM_INTERNAL_APP_PORT || 8000);
const PIVOT_AGENT = /^MarketMarney-Automatic-Pivot\//;
const INTERNAL_PATH = /^\/api\/(?:market\/ohlc|pivot-public)(?:\?|$)/;

function headerValue(headers,name) {
  if (!headers || typeof headers !== 'object') return '';
  for (const [key,value] of Object.entries(headers)) {
    if (String(key).toLowerCase() === name) return String(value || '');
  }
  return '';
}

function shouldRewrite(options) {
  if (!options || typeof options !== 'object' || !Number.isInteger(INTERNAL_PORT) || INTERNAL_PORT < 1 || INTERNAL_PORT > 65535) return false;
  const hostname = String(options.hostname || options.host || '').replace(/^\[|\]$/g,'').split(':')[0];
  const pathname = String(options.path || options.pathname || '/');
  const agent = headerValue(options.headers,'user-agent');
  return (hostname === '127.0.0.1' || hostname === 'localhost') && INTERNAL_PATH.test(pathname) && PIVOT_AGENT.test(agent);
}

function rewriteOptions(options) {
  if (!shouldRewrite(options)) return options;
  const headers = {...(options.headers || {})};
  for (const key of Object.keys(headers)) {
    const lower = key.toLowerCase();
    if (lower === 'host' || lower === 'x-real-ip' || lower === 'x-forwarded-for' || lower === 'x-forwarded-proto' || lower === 'forwarded') delete headers[key];
  }
  headers.Host = '127.0.0.1:' + INTERNAL_PORT;
  return {
    ...options,
    hostname: '127.0.0.1',
    host: undefined,
    port: INTERNAL_PORT,
    headers
  };
}

const nativeRequest = http.request;
http.request = function(...args) {
  if (args[0] && typeof args[0] === 'object' && !(args[0] instanceof URL)) args[0] = rewriteOptions(args[0]);
  return nativeRequest.apply(this,args);
};

console.log('MM_AUTOMATIC_PIVOT_INTERNAL_ROUTE_READY '+JSON.stringify({version:VERSION,internalPort:INTERNAL_PORT,paths:['/api/market/ohlc','/api/pivot-public']}));

module.exports={VERSION,INTERNAL_PORT,shouldRewrite,rewriteOptions};
