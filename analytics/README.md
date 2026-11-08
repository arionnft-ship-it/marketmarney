# MarketMarney visitor statistics — Google Analytics 4 (optional)

This patch does not change the website's visual design, installed data, account APIs, authentication or the persistent /persist volume.

## Activation prerequisites

1. Create or select a GA4 property at https://analytics.google.com/.
2. Under Admin → Data streams → Web, create/select the stream for https://marketmarney.com.
3. Copy its Measurement ID in the form G-XXXXXXXXXX.
4. After reviewing the privacy notice and applicable consent requirements, set the Railway web service environment variable MM_GA4_MEASUREMENT_ID to that ID.
5. Deploy the reviewed branch to the domain's Railway service; the tag is injected only into public HTML responses if the ID is valid.
6. Check the homepage and a canonical article with browser developer tools and the GA4 Realtime report. Verify that gtag.js is allowed by Content Security Policy.
7. For hash-based single-page article navigation, validate page_view events in GA4 DebugView/Realtime; configure enhanced measurement to prevent double-counting.

## Guardrails

- Disabled by default: an absent or invalid ID injects no tag.
- Public homepage, article and public HTML paths are eligible. Paths for login, admin, account, profile, payment, private or API endpoints are excluded.
- Never put a personal API secret into a public page. GA4 Measurement IDs are not secrets.
- The Google tag loads asynchronously. No CSS or visible component is added.
- The tag uses default GA4 browser data collection (including first-party cookies). Publish appropriate privacy information and implement any required consent controls before activation. Disabling Google signals and ad personalization signals does not disable analytics cookies.
- GA4 does not reconstruct historical visitor counts from before tracking was enabled.
- Full end-to-end verification is required after deployment; local regression tests cover injection logic but cannot prove production data is reaching GA4.

## Build safety

The Dockerfile copies analytics/, patches the image-local brand wrapper after existing installers, checks syntax and runs node --test analytics/ga4.test.cjs. If the expected wrapper anchor changes, the build fails rather than silently modifying unrelated files.
