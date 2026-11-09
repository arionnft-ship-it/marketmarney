# MarketMarney — website logo (9 November 2026)

Uses the exact black-and-orange rising M symbol, **MarketMarney** wordmark and **marketmarney.com** uploaded by the website owner. The source is optimized to 800×170 for web delivery and stored in `user-logo-20261109.b64`; the build validates its SHA-256.

Existing /assets/brand-logo.png and .webp URLs serve a square **M icon cropped from the uploaded logo**, keeping existing 40×40 header/logo locations readable. /assets/brand-wordmark.png and .webp serve the full uploaded horizontal artwork. Favicons, Apple touch and PWA icons use the matching M icon on a white background.

The response-only brand adapter and versioned cache update the website presentation. User/group uploads, news images, authentication, databases, protected code and market data are unchanged. The app's manifest ID and start URL remain unchanged.

Build: `python marney-brand/build-assets.py`. Rollback: restore the previous pinned Railway service commit/deployment. No data migrations.
