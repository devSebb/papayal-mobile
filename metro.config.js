// Metro config exists solely to wrap Expo's default config with Sentry's.
//
// getSentryExpoConfig injects a Debug ID into the bundle and the emitted source
// map so Sentry can pair them at symbolication time. Without it, an uploaded
// source map is matched by filename/release only, which silently fails whenever
// the release string drifts from what the build uploaded — the failure mode is
// an unreadable Hermes stack trace, identical to uploading nothing at all.
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

module.exports = getSentryExpoConfig(__dirname);
