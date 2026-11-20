// expo-text-extractor uses ML Kit's *unbundled* text model on Android, which
// Google Play Services downloads in the background on first use. Until that
// finishes (or forever on phones without Play Services), every scan fails.
// Adding the bundled artifact ships the model inside the app so receipts can be
// read offline immediately, matching Eunox's on-device promise. (~4 MB per ABI)
const { withAppBuildGradle } = require('expo/config-plugins');

const DEPENDENCY = "implementation 'com.google.mlkit:text-recognition:16.0.1'";

module.exports = function withBundledTextRecognition(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes('com.google.mlkit:text-recognition:')) {
      cfg.modResults.contents = cfg.modResults.contents.replace(
        /dependencies\s*\{/,
        (match) => `${match}\n    // Bundled ML Kit text model for receipt scanning (see plugins/)\n    ${DEPENDENCY}\n`
      );
    }
    return cfg;
  });
};
