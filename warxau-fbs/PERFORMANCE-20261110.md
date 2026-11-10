# MarketMarney performance optimization (10 Nov 2026)

Scope: public news thumbnail rendering, public Analisa Market cards and navigation only. No modifications to login, database, protected uploads, media files, admin editing, live price feeds, or news publishing.

1. Bump generated public thumbnails to 24-hour browser caching while keeping the existing published-only catalog authorization check, ETags, redirects and fallback behavior. Content-addressed app assets retain their 1-year immutable policy.
2. Analisa Market published cards request 640px derived WebP thumbnails with native lazy loading, async decoding and a one-time fallback to the original media URL. Original full-resolution image remains available on the article page.
3. The homepage already fetches /api/content for public news. Share *published analysis entries only* for up to 25 seconds with the Analisa panel to avoid a second full data download on quick navigation. After 25 seconds, the normal read-only API request remains authoritative.

Tests: `node --test warxau-fbs/performance-runtime.test.cjs` and `node --test warxau-fbs/analysis-upload.test.cjs` with npm dependencies installed. Rollback by redeploying prior Railway commit; no volume migration. Performance improvement will depend on browser cache, network and page content.
