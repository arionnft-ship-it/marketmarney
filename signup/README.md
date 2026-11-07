# Social Marney: required name and email at registration

Scope: newly created reader accounts only. The existing username/password login, explicit Google linking, existing Google logins, admin access, display-name rules, MARNEY logo, news layout and WarXAU chat are retained.

The account form has required display name, email, username and password. The server validates before creating a user. User, private registration metadata, display name and reader session are committed atomically; failures roll back the new account. Old users are not backfilled or required to register again.

Private metadata uses an additive SQLite table, `community_registration_20261107`. It is not joined into public reader/profile responses. Case-insensitive email uniqueness is an explicit policy among new registrations only, not a claim about historical users. Dots and plus aliases are not collapsed. Manual email is stored as unverified: no mail, OTP, recovery, or email-based login is added in this change. Google identity continues to use verified `sub`, not email matching. For new Google identities, the signed verified email and name are required and stored privately; the Google name is not automatically published as a display name.

The protected /persist source is not overwritten. A bounded Node preload transforms known application modules in memory; missing source/template anchors stop startup before serving. The existing branding response layer adapts only /akun.html. NODE_OPTIONS must be inherited by the existing child server. Verify the `MM_SIGNUP_NAME_EMAIL_READY` log and the registrationFields declaration from /api/community/status after deployment. Absence of these signals means the backend policy is not confirmed.

Before deployment: local tests with the actual v18.8.3 app baseline and Android Google patch passed 48 backend checks, including registration rollback, privacy, old login and Google signature/nonce/audience tests. The actual account controller and CSS passed 28 isolated browser/mock-API checks at 390 and 1280 pixels. These are local synthetic tests, not real-user account creation.

Rollback: redeploy the previous build. Do not drop the new metadata table or change old user records. Keeping it preserves metadata already supplied by new users. Rollback does not erase any account. No real-user sign-in is performed by the test suite.
