/**
 * Unit tests for the money-shaped logic the reloadable-card UI depends on
 * (RELOADABLE_CARD_PLAN.md §12.2). jest-expo supplies the React Native
 * preset; only `src/` is under test — there is no component/e2e suite.
 */
module.exports = {
  preset: "jest-expo",
  testMatch: ["<rootDir>/__tests__/**/*.test.ts?(x)"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)"
  ],
  collectCoverageFrom: ["src/domain/**/*.ts", "src/utils/**/*.ts"]
};
