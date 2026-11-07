# Marney 4.17 — logo MARNEY

This branch contains the exact reviewed branding update based on the final, successful Marney 4.16 source from commit `6aedf059035cffa493b85a09e77c83e5f6c888a9`, Actions run `42331459066`.

`source417.zip` contains the complete reviewed text/XML/test source. The approved PNG is stored once as `logo.png`; `prepare417.py` copies those exact bytes to the native drawable, legacy launcher icon and offline web asset before validating every source file against `files417.json`. There is no dependency on an earlier Actions artifact remaining available.

## Build

```sh
python3 mobile417/prepare417.py
gradle --no-daemon --project-dir android417 :app:assembleDebug :app:assembleDebugAndroidTest :app:lintDebug
```

Use Java 17, Gradle 8.13, Android SDK platform 36 and build-tools 35.0.0, matching the last successful build. The workflow performs these steps and runs the existing Android 29/35 suites plus the offline-brand delivery and origin-boundary checks.

## Scope

- The exact approved M + MARNEY image is used by the launcher, Android system splash, opening animation and offline screen.
- Bundled news, Social Marney, Reels, groups, profiles and corporate logo fallbacks use the same offline asset.
- Public web corporate logo aliases are intercepted only at the known trusted paths. WarXAU 7.7's two embedded corporate images are replaced using its exact header/favicon selectors, without changing game or feed code.
- The five destinations, gallery, messages, profiles, media, session handling, network security and opening timing are preserved.

The build is a separately installed debug beta, `com.marketmarney.mobile.beta417`, version `4.17.0-beta` (21). It does not overwrite a differently signed beta416 or the main app. Existing login sessions do not transfer automatically. The existing email login remains available; native Google OAuth is not registered for this new beta package and continues to use the established explanatory fallback. No OAuth credentials, backend configuration, Railway services or Play Store release are changed by this workflow.
