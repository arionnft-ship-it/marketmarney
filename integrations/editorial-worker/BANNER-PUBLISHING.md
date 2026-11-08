# MarketMarney — banner + article publishing

This module extends the already-working **v18.8.3** editorial integration. It does **not** replace the admin dashboard, the SQLite database, public routes, or the session mechanism.

## What happens on publishing

The authorized worker sends exactly one HTTPS-era bearer-authenticated JSON request through Railway private networking.

- `POST /api/integrations/articles`: create an article, optionally with a banner in the **same request**.
- `POST /api/integrations/articles/banner`: attach a banner to a published or draft article by ID; replacement requires `replace_banner:true`.

Example new article body (replace placeholders with actual article information):

```json
{
  "title": "A factual news title with at least 20 characters",
  "summary": "A verified short summary with at least 55 characters and a neutral tone.",
  "content": "Original article with at least 150 plain-text characters. Use two newlines for paragraphs.",
  "category": "EMAS",
  "status": "published",
  "confirm_publish": true,
  "source_name": "Verified editorial source",
  "source_url": "https://publisher.example.com/article",
  "banner": {
    "mime_type": "image/png",
    "base64": "<base64 bytes from an authorized local image>"
  }
}
```

Existing article attachment:

```json
{
  "article_id": "mm-editorial-...",
  "confirm_attach": true,
  "replace_banner": false,
  "banner": {
    "mime_type": "image/jpeg",
    "base64": "<base64 image bytes>"
  }
}
```

For articles without a banner, omit `banner`; the existing text-only route remains compatible.

## Image restrictions

- PNG, JPEG or WebP only. Signatures and Sharp decoding must match the declared MIME type.
- Input at most 5 MiB. JSON request at most 7.6 MB.
- Source resolution 480×260 through 7000×7000, input pixels limited to 24 million, aspect ratio from 0.65 to 4.
- Re-encoded to WebP (max 1600×900, *no cropping*), stripped metadata; output at most 3 MiB.
- Persisted at `<MM_DATA_DIR>/uploads/<uuid>.webp`, served by the **existing** `/media/<uuid>.webp` route. Article `img` uses the same relative URL as the admin editor.
- Invalid upload does not change SQLite or save a media file. On a DB transaction failure, the newly created file is unlinked. Existing images are **not** automatically deleted on replacement; other content may reference them.

## Safety and operations

- Existing SHA-256 bearer credential is required for both routes. Keep the raw token only in the private editorial worker, never GitHub or chat. No separate anonymous upload endpoint is created.
- A SQLite `VACUUM INTO` backup and integrity check precedes each database mutation; media files need separate persistent backups.
- Article creation uses id/source/title duplicate checking, quality gate, and atomic editorial audit. Attaching images checks the article ID and rejects overwrites unless explicitly requested.
- Worker source: `integrations/editorial-worker/index.ts`. Run it as the Railway Function `marketmarney-editorial-worker` (no public domain). It reads either `MM_ARTICLE_PAYLOAD_JSON` or `MM_ARTICLE_BANNER_PAYLOAD_JSON`, never both. Remove the one-off payload variable after execution.
- `MM_ARTICLE_BEARER_SHA256` belongs only on `marketmarney-web`. Keep `marketmarney-web` connected to a specific verified SHA on branch `fix/site-performance-audit-20261108` to avoid the default branch that lacks the Dockerfile.
- Important: updating the actual Railway Function code and successfully deploying the gateway are separate operations from merging source.
- Do not write banners into GitHub source or embed customer images as Git history. Use the protected private worker payload.
- Tests: `node --test warxau-fbs/article-publisher.test.cjs warxau-fbs/article-banner.test.cjs` after `npm ci --omit=dev` in `warxau-fbs`. GitHub Actions additionally builds the production Dockerfile without deploying.
