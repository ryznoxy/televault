module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(?:@?react-native.*|@react-navigation|@op-engineering|@transistorsoft|@noble|react-native-get-random-values|@react-native-clipboard)/)',
  ],
};
