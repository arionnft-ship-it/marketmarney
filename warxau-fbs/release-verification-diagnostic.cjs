'use strict';

// Diagnostics for the release verifier only. It preserves the verifier result and
// redacts common credential-like values before emitting a bounded log message.
const cp = require('node:child_process');
const path = require('node:path');

const originalSpawnSync = cp.spawnSync;
let logged = false;

function sanitize(value) {
  return String(value || '')
    .slice(0, 12000)
    .replace(/[a-f0-9]{64}/gi, '[sha256]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(/(client_secret|api[_-]?key|token|password)(\s*[:=]\s*)[^\s,;]+/gi, '$1$2[redacted]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]');
}

cp.spawnSync = function marketMarneyVerificationDiagnostic(command, args, options, ...rest) {
  const result = originalSpawnSync.call(this, command, args, options, ...rest);
  const firstArg = Array.isArray(args) && args.length ? String(args[0]) : '';
  if (!logged && command === process.execPath && path.basename(firstArg) === 'VERIFIKASI-RILIS.js') {
    logged = true;
    console.log('MM_RELEASE_VERIFICATION_RESULT ' + JSON.stringify({
      status: result && result.status,
      signal: result && result.signal,
      error: result && result.error ? sanitize(result.error.message || result.error) : '',
      stdout: sanitize(result && result.stdout),
      stderr: sanitize(result && result.stderr)
    }));
  }
  return result;
};

console.log('MM_RELEASE_VERIFICATION_DIAGNOSTIC_READY');
