'use strict';
// Patch the image-local HTML response layer AFTER signup and brand installers.
// No edits to /persist or the original site files.
const fs = require('node:fs');
const vm = require('node:vm');
const REQUIRE = "const mmGA4=require('./analytics/ga4.cjs');";
const BEFORE = "changed=enhance(require('./signup/account-page.cjs').enhanceAccount(raw,p)),out=changed===raw?data:Buffer.from(changed)";
const AFTER = "changed=mmGA4.injectGoogleTag(enhance(require('./signup/account-page.cjs').enhanceAccount(raw,p)),p,process.env.MM_GA4_MEASUREMENT_ID),out=changed===raw?data:Buffer.from(changed)";
function patch(source) {
  if (source.includes(REQUIRE) && source.includes(AFTER)) return source;
  if (!source.startsWith("'use strict';\n") || source.split(BEFORE).length !== 2 || source.includes(REQUIRE)) {
    throw Error('Analytics install anchor changed; refusing partial patch');
  }
  const next = source.replace("'use strict';\n", "'use strict';\n" + REQUIRE + '\n').replace(BEFORE, AFTER);
  new vm.Script(next);
  return next;
}
if (require.main === module) {
  const file = process.argv[2] || 'branding.cjs';
  const previous = fs.readFileSync(file, 'utf8');
  const next = patch(previous);
  if (previous !== next) fs.writeFileSync(file, next);
  console.log('MM_GA4_OPTIONAL_WRAPPER_READY');
}
module.exports = {patch, REQUIRE, BEFORE, AFTER};
