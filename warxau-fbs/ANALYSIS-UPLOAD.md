# MarketMarney · Unggah Analisa Market (10 Nov 2026)

Adds an analysis publishing panel within the existing admin UI. Admins can choose symbol, timeframe, bias, category, summary, full analysis and optionally upload an image (PNG/JPG/WebP <=5 MB). Supports Draft/Publish/Edit. The public Technical Analysis section displays only published analysis cards alongside the existing TradingView analysis and automatic pivot.

Authorization: uses the existing session-protected /api/admin/content (GET and PUT with If-Match revision) and /api/admin/upload endpoints; no new public write routes or secrets. Source content is stored in the existing articles store, with an mm-analysis- ID prefix; normal admin article editing remains available. Public cards use the existing /api/content read endpoint and link to canonical /berita/<id> articles. No automatic publishing and no changes to user uploads, news, database schema or market feeds.

Revert by restoring the prior pinned Railway deployment; the new code is a response-only injection and introduces no migration. Test: node --test warxau-fbs/analysis-upload.test.cjs. Admin write needs manual verification after signing in as an authorized administrator.

Placement update: published analysis cards are displayed inside the main Analisa shell, immediately after the 'Panduan interpretasi indikator' card and before the existing Pivot Points card. The public script waits until both anchors are mounted and repositions on SPA navigation. Cache version: 20261110-v2.
