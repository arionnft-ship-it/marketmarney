# Secure MarketMarney article publishing — integration scaffold

**Status: NOT DEPLOYED.** This is an optional adapter, not a live publishing API.

The current GitHub repository contains an Android application, while the connected Railway service starts backend code from `warxau-fbs` that is **not present** in the repository. Do not point Railway's live deployment at this branch. It could cause a website outage.

## Integration with actual backend

1. Locate the real MarketMarney backend source, admin article service, storage and requirements for bilingual articles and thumbnails.
2. In its existing Express application, mount the protected route:

```js
const { createArticlePublishHandler } = require('./integrations/article-publishing/publish-route.cjs');
app.post('/api/integrations/articles', express.json({ limit: '64kb' }),
  createArticlePublishHandler({
    token: process.env.MM_ARTICLE_API_TOKEN,
    publishArticle: async article => {
      // REQUIRED: call actual authenticated article service,
      // enforce duplicate detection, audits, bilingual/thumbnail validation,
      // and return an article ID and public URL.
      return existingArticleService.create(article);
    }
  }));
```

3. Generate a minimum 32-character random `MM_ARTICLE_API_TOKEN`. Store it as a secret in Railway, not in GitHub or chat. Use HTTPS and rate limiting. Consider a separate token with write-only article scope.
4. Test an unpublished draft in staging before publishing a controlled test article. Confirm database consistency, admin visibility and public URL.
5. Set up a ChatGPT-compatible custom integration to invoke this authenticated API. A GitHub/Railway connection **alone cannot invoke the article route**.

Security: bearer authentication uses a timing-safe digest comparison; the adapter validates article type, size, category, status and HTTPS source URL. It does **not** supply database logic, identity management, a credential connector, image uploading, or live testing. Keep it disconnected until all of those are configured.

No changes are made to the live website from this branch.
