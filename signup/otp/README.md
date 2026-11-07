# Social Marney email OTP — pending sender authorization

Prepared against deployed source ac1890b5be2bc5aab4605b502ae1122705e4901b. This isolated branch is not deployed and does not enable OTP on marketmarney.com.

Six-digit email verification expires after five minutes. Resend cooldown: 60 seconds. Five incorrect attempts invalidate a challenge. Email, browser, source and daily send limits apply. OTPs are stored as keyed HMACs, bound to an HttpOnly cookie and email, and consumed atomically with user creation. No password is stored in the challenge or sent to the mail provider. Existing password logins and linked Google accounts remain unchanged. New Google accounts cannot bypass required OTP; they must register through the form and then explicitly link Google.

## Activation gate
Do not activate until a real sender has been authorized and tested. Required private Railway variables:
- RESEND_API_KEY: sending-only key scoped to a verified MarketMarney sending domain.
- MM_EMAIL_FROM: sender such as otp@auth.marketmarney.com; this address is proposed, not configured.
- MM_OTP_SECRET: stable cryptographically random 32-byte secret represented as 64 hexadecimal characters.
- MM_SIGNUP_EMAIL_OTP=required: only after integration tests and a real delivery test to an owner-approved mailbox.
- MM_OTP_DAILY_LIMIT: optional application quota, default 100.

Never place API keys, OTP secrets, email credentials, or actual user information in this public repository or chat. Do not change root-domain Google Workspace MX records. Use provider-issued DNS records for the sending subdomain only. Provider acceptance is not proof of inbox delivery.

Build-time installer verifies the two existing signup source hashes and does not modify protected /persist files. Default behavior remains unchanged unless the required flag is set; required mode without sender configuration rejects registration rather than silently skipping verification. This branch preserves current news performance and five-market arena changes.

Validation this turn: the archived 20-test OTP core suite was re-run locally and passed using synthetic data and a fake sender. Real email delivery and production OTP are not yet verified. CI in this branch additionally checks source syntax, safe build hooks, expiry, single-use, retry, binding, and missing sender using synthetic data; it sends no email and does not deploy.
