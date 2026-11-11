'use strict';

// Preserve the verified public gateway bytes exactly. The diagnostic below emits
// only a short, sanitized source-code window around the gateway's integrity error;
// it never logs environment-variable values, cookies, requests, or user data.
const fs = require('node:fs');

const TARGET = '/tmp/marketmarney-public.cjs';
const delegatedWriteFileSync = fs.writeFileSync;
let diagnosticLogged = false;

function sanitizedIntegrityContext(buffer) {
  const text = buffer.toString('utf8');
  const marker = 'Source integrity check failed';
  const index = text.indexOf(marker);
  if (index < 0) return null;
  return text
    .slice(Math.max(0, index - 1400), Math.min(text.length, index + 500))
    .replace(/[a-f0-9]{64}/gi, '[sha256]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(/([?&](?:token|key|secret|signature)=)[^&'"\s]+/gi, '$1[redacted]');
}

function writeExact(target, data, options) {
  const encoding = typeof options === 'string'
    ? options
    : options && options.encoding
      ? options.encoding
      : 'utf8';
  const mode = options && typeof options === 'object' && Number.isInteger(options.mode)
    ? options.mode
    : 0o600;
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(String(data), encoding);
  if (!diagnosticLogged) {
    diagnosticLogged = true;
    const context = sanitizedIntegrityContext(buffer);
    console.log('MM_GATEWAY_INTEGRITY_CONTEXT ' + JSON.stringify({found:Boolean(context),context:context || ''}));
  }
  const fd = fs.openSync(target, 'w', mode);
  try {
    let offset = 0;
    while (offset < buffer.length) {
      offset += fs.writeSync(fd, buffer, offset, buffer.length - offset, null);
    }
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

fs.writeFileSync = function marketMarneyIntegritySafeWrite(target, data, options, ...rest) {
  if (String(target) !== TARGET) {
    return delegatedWriteFileSync.call(this, target, data, options, ...rest);
  }
  return writeExact(target, data, options);
};

console.log('MM_GATEWAY_INTEGRITY_COMPAT_READY ' + JSON.stringify({target:TARGET,gatewayMutation:false,diagnostic:'source-only'}));

module.exports = {TARGET, writeExact, sanitizedIntegrityContext};
