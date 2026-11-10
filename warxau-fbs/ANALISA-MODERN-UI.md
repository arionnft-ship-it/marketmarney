# Modern public Analisa Market interface — 10 November 2026

Only adds a lightweight CSS file, loaded on public homepage/SPA Analisa. Affected: shell, chart card wrappers, indicator guide, published-analysis cards, Pivot Point card. No changes to JS, data queries, chart widget, article content, authentication, or Admin UI. Subtle white surfaces, accessible amber accents, responsive columns, hover/focus feedback.

Build verification: node --test warxau-fbs/analysis-upload.test.cjs; browser preview on feature branch before deploying. Rollback: Railway redeploy pre-change successful commit f515e40eb8d63c74ac131c9f55dcddd00ae1d200.
