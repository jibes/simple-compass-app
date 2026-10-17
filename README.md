# Compass

A quiet, precise compass. One web app, shipped as a PWA and as a native Android app.

**Web:** https://jibes.github.io/simple-compass-app/ · **Android:** [Add to Obtainium](https://apps.obtainium.imranr.dev/redirect?r=obtainium://add/https://github.com/jibes/simple-compass-app)

## What it does

- **Tilt-compensated heading.** Reads correctly flat or held upright (switches smoothly from the top-edge axis to the camera axis).
- **True north** everywhere: bundled World Magnetic Model 2025 (verified against NOAA's official test values), computed from your GPS fix. Tap the top-left label to toggle magnetic/true.
- **Bearing lock.** Tap the dial to lock the current heading. An arc shows how far to turn; a haptic pulse confirms when you're back on bearing. Tap again to release.
- **Sun marker** on the rim (filled above the horizon, hollow below) — a free cross-check of your compass.
- **Level** — the centre dot is a spirit-level bubble.
- **Speed** appears only while you're moving: GPS speed with accuracy gating, outlier and acceleration limits, smoothing, and start/stop hold times so a bad fix never flickers it.
- **Haptic detents** every 45°, position/altitude/accuracy, tap position to copy. Works offline. Keeps the screen awake.

## Layout

```
web/        The app (no build step, no dependencies)
android/    Native shell: WebView + rotation-vector sensor, calibration, haptics
tests/      node --test for heading, sun and WMM2025 math
```

## Install on Android via Obtainium

1. Install [Obtainium](https://github.com/ImranR98/Obtainium).
2. Tap the *Add to Obtainium* link above, or add `https://github.com/jibes/simple-compass-app` manually.
3. Obtainium picks up the APK from each GitHub release and updates automatically.

## Releasing

Bump `VERSION` and push to `main`. If no `v<version>` tag exists yet, CI builds a signed `compass-<version>.apk`, tags the commit and publishes a GitHub release. Pushing a `v*` tag or running **Actions → Android → Run workflow** with a version does the same. Every other push builds a test APK artifact.

## Signing

Releases are signed with a private key held only in repository secrets; CI refuses to publish without it. Test builds without secrets are debug-signed.

One-time setup (needs `keytool` from any JDK and the [GitHub CLI](https://cli.github.com)):

```bash
keytool -genkeypair -keystore compass-release.jks -storetype PKCS12 -alias compass \
  -keyalg RSA -keysize 4096 -validity 36500 -dname "CN=Compass"
base64 -w0 compass-release.jks | gh secret set COMPASS_KEYSTORE_BASE64 -R jibes/simple-compass-app
gh secret set COMPASS_KEYSTORE_PASSWORD -R jibes/simple-compass-app   # paste the keystore password
```

(macOS: `base64 -i compass-release.jks`.) Back up `compass-release.jks` and its password offline. Obtainium only accepts updates signed with the same key, so losing it means every user reinstalls. Optional secrets: `COMPASS_KEY_ALIAS` (default `compass`), `COMPASS_KEY_PASSWORD` (defaults to the keystore password).

## Development

```bash
npx http-server web        # open http://localhost:8080 (localhost is a secure context)
node --test tests/*.test.js
cd android && ./gradlew assembleDebug   # needs Android SDK (ANDROID_HOME)
```

Browser support: Chrome/Edge on Android use `deviceorientationabsolute`; iOS Safari uses `webkitCompassHeading` (asks for motion permission on first tap). Desktop browsers without a magnetometer get a drag-to-turn preview. GitHub Pages must be set to deploy from **GitHub Actions** (Settings → Pages).

## Licence

[GPL-3.0-or-later](LICENSE).
