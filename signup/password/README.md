# Social Marney password security

This release adds two user-facing flows without changing admin authentication:

1. **Forgot password with email OTP** for accounts that have a previously verified recovery email.
2. **Change password** in the signed-in account security panel using the current password.

## Recovery policy

- Six-digit code, five-minute expiry, one-time use, maximum five incorrect attempts.
- A 60-second resend cooldown plus source, browser, email and daily limits.
- Challenges are bound to a private HttpOnly cookie and the normalized email.
- OTP values are stored only as keyed HMACs. Passwords are never stored in a recovery challenge or sent to Resend.
- Request responses are generic for valid email syntax, whether or not an account exists. Unknown or historically unverified email addresses do not receive mail and cannot reset a password.
- Successful reset rotates the password salt/hash, deletes every reader session for that user and requires a fresh login.
- Successful signed-in password change also deletes every reader session and requires a fresh login.

## Compatibility

The feature is layered over the current signup/email-OTP release at build and runtime. Protected application files in `/persist` are not overwritten. Missing transformation anchors fail the build/startup instead of silently weakening the policy.

Existing linked Google login is unchanged. A user who cannot use email recovery may still sign in with a previously linked Google account. Historical accounts without a verified recovery email are not silently trusted; they can continue changing their password while signed in.

## Configuration

- `MM_PASSWORD_EMAIL_OTP=required`
- `MM_PASSWORD_OTP_DAILY_LIMIT` (default 50)
- Existing sender and private-key settings are reused: `RESEND_API_KEY`, `MM_EMAIL_FROM`, `MM_OTP_SECRET_FILE`.

Never put credentials or OTP values in the repository, logs or support messages.
