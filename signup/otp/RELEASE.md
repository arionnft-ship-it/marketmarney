# Email OTP activation r2

Based on the current deployed light-theme/performance release dbb49a28a007bff0563371c702807af7be97a689. Preserves current website features and existing user logins. Domain auth.marketmarney.com was verified by the owner and the API key was entered privately in Railway; no API key is stored here.

Before rollout, run `node /opt/warxau-fbs/signup/otp/preflight.cjs` as Railway's pre-deploy command. The probe sends one synthetic message to the documented Resend delivered test address, never to an unapproved user. Provider acceptance is not proof of delivery to a real Gmail inbox. A failed probe must stop rollout.

Set sender `otp@auth.marketmarney.com`, `MM_SIGNUP_EMAIL_OTP=required`, and `MM_OTP_SECRET_FILE=/persist/.marketmarney-private/signup-otp.secret`. The server creates a random 32-byte key with private file/directory permissions on the persistent volume if no secret is supplied by environment. It never returns/logs the secret. Backup and protect this private directory along with the database. Do not recreate an existing key; invalid key files fail startup. Daily application send limit is configurable; no plan upgrade is performed.

Local validation this turn: 36 backend/security tests passed (20 core/provider, 11 integration with actual v18.8.3 community module and synthetic database, 5 new key/preflight tests). 22 browser assertions passed using the actual account controller with inline styles and mocked API calls at 390px and 1280px. Full live browser verification occurs only after deployment; screenshots from local tests are not live evidence.

New accounts must verify a six-digit email code (five-minute expiry; resend after 60 seconds; five invalid attempts). New Google registrations cannot bypass this policy; existing linked Google accounts continue to work and new users can link Google after OTP registration. OTP data contains no passwords. Consumption and account creation use one transaction. No public response contains email addresses or OTP values.

Rollback uses the preceding build and removes its new pre-deploy command from the service configuration. Preserve the additive OTP tables and private key; do not delete user records. Until the new release actually succeeds and the API reports required/available true, do not claim production OTP is active.
