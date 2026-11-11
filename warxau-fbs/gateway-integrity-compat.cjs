'use strict';

// The verified public gateway performs its own source-integrity check.
// An older upload-limit preload rewrites the gateway while it is written to /tmp,
// which invalidates that check. Preserve the verified gateway bytes exactly.
// Social client/server validation remains active; large-upload transport is handled
// independently so the public gateway itself is never modified.
const fs = require('node:fs');

const TARGET = '/tmp/marketmarney-public.cjs';
const delegatedWriteFileSync = fs.writeFileSync;

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

console.log('MM_GATEWAY_INTEGRITY_COMPAT_READY ' + JSON.stringify({target:TARGET,gatewayMutation:false}));

module.exports = {TARGET, writeExact};
