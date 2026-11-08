'use strict';
const crypto = require('node:crypto');

/**
 * Express-compatible route handler. Integrate with the actual MarketMarney
 * article service; NEVER run this as a standalone publishing database.
 */
function createArticlePublishHandler({ token, publishArticle }) {
  if (typeof token !== 'string' || token.length < 32) throw new Error('API token must be at least 32 characters');
  if (typeof publishArticle !== 'function') throw new Error('publishArticle callback required');
  const expected = crypto.createHash('sha256').update(token).digest();
  return async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
    const m = /^Bearer (\S+)$/i.exec(req.headers?.authorization || '');
    const received = m ? crypto.createHash('sha256').update(m[1]).digest() : Buffer.alloc(32);
    if (!m || !crypto.timingSafeEqual(expected, received)) return res.status(401).json({ error: 'unauthorized' });
    if (!req.is?.('application/json')) return res.status(415).json({ error: 'json_required' });
    const b = req.body;
    if (!b || typeof b !== 'object' || Array.isArray(b)) return res.status(400).json({ error: 'invalid_body' });
    const article = {
      title: typeof b.title === 'string' ? b.title.trim() : '',
      summary: typeof b.summary === 'string' ? b.summary.trim() : '',
      content: typeof b.content === 'string' ? b.content.trim() : '',
      category: typeof b.category === 'string' ? b.category.trim().toUpperCase() : '',
      status: b.status || 'draft',
      source_url: typeof b.source_url === 'string' ? b.source_url.trim() : ''
    };
    if (!article.title || article.title.length > 200 ||
        !article.summary || article.summary.length > 1000 ||
        !article.content || article.content.length > 50000 ||
        !['EMAS','FOREX','CRYPTO','SAHAM','EKONOMI'].includes(article.category) ||
        !['draft','review','published'].includes(article.status)) {
      return res.status(400).json({ error: 'invalid_article' });
    }
    if (article.source_url) {
      try {
        const url = new URL(article.source_url);
        if (url.protocol !== 'https:' || url.username || url.password || article.source_url.length > 2000) throw Error();
      } catch (_) { return res.status(400).json({ error: 'invalid_source_url' }); }
    }
    try {
      // The callback must enforce permissions, uniqueness and audit logging.
      const saved = await publishArticle(article);
      return res.status(201).json({ ok: true, article: saved });
    } catch (_) {
      return res.status(500).json({ error: 'publish_failed' });
    }
  };
}
module.exports = { createArticlePublishHandler };
