# Compass

A quiet, precise compass. One web app, shipped as a PWA and as a native Android app.

**Web:** https://jibes.github.io/simple-compass-app/ · **Android:** [Add to Obtainium](https://apps.obtainium.imranr.dev/redirect?r=obtainium://add/https://github.com/jibes/simple-compass-app)

## What it does

- **Tilt-compensated heading.** Reads correctly flat or held upright (switches smoothly from the top-edge axis to the camera axis).
- **True north** on Android (WMM declination from the system); tap the top-left label to toggle magnetic/true.
- **Bearing lock.** Tap the dial to lock the current heading. An arc shows how far to turn; a haptic pulse confirms when you're back on bearing. Tap again to release.
- **Sun marker** on the rim (filled above the horizon, hollow below) — a free cross-check of your compass.
- **Level** — the centre dot is a spirit-level bubble.
- **Haptic detents** every 45°, position/altitude/accuracy, tap position to copy. Works offline. Keeps the screen awake.

## Layout

```
web/        The app (no build step, no dependencies)
android/    Native shell: WebView + rotation-vector sensor, declination, haptics
tests/      node --test for the heading/sun math
```

## Install on Android via Obtainium

1. Install [Obtainium](https://github.com/ImranR98/Obtainium).
2. Tap the *Add to Obtainium* link above, or add `https://github.com/jibes/simple-compass-app` manually.
3. Obtainium picks up the APK from each GitHub release and updates automatically.

## Releasing

Either push a tag:

```bash
git tag v1.0.0 && git push origin v1.0.0
```

or run **Actions → Android → Run workflow** with a version. CI builds a signed `compass-<version>.apk` and attaches it to a GitHub release. Every other push builds an APK artifact for testing.

## Signing

Obtainium only accepts updates signed with the same key. Releases are signed with `android/signing/compass.jks` (password `compass`, alias `compass`) so CI works with zero setup.

To use a private key instead, add repository secrets `COMPASS_KEYSTORE_BASE64` (`base64 -w0 your.jks`), `COMPASS_KEYSTORE_PASSWORD`, `COMPASS_KEY_ALIAS`, `COMPASS_KEY_PASSWORD`. Do this **before** the first release you distribute — switching keys later forces users to uninstall and reinstall.

## Development

```bash
npx http-server web        # open http://localhost:8080 (localhost is a secure context)
node --test tests/*.test.js
cd android && ./gradlew assembleDebug   # needs Android SDK (ANDROID_HOME)
```

Browser support: Chrome/Edge on Android use `deviceorientationabsolute`; iOS Safari uses `webkitCompassHeading` (asks for motion permission on first tap). Desktop browsers without a magnetometer get a drag-to-turn preview. GitHub Pages must be set to deploy from **GitHub Actions** (Settings → Pages).
