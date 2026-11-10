'use strict';

// Optional short-lived secondary credential for editorial publishing.
// The existing primary credential remains configured in Railway and is restored
// automatically whenever MM_ARTICLE_BEARER_SHA256_ONETIME is unset or invalid.
const candidate=String(process.env.MM_ARTICLE_BEARER_SHA256_ONETIME||'').trim().toLowerCase();
if(/^[0-9a-f]{64}$/.test(candidate)){
 process.env.MM_ARTICLE_BEARER_SHA256=candidate;
 console.log('MM_ARTICLE_ONETIME_TOKEN_ACTIVE');
}
