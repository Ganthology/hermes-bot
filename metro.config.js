const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { getBundleModeMetroConfig } = require('react-native-worklets/bundleMode');

/** @type {import('expo/metro-config').MetroConfig} */
let config = getDefaultConfig(__dirname);

// Bundle Mode emits worklet modules under node_modules/react-native-worklets/.worklets
config.watchFolders = [
  ...(config.watchFolders ?? []),
  path.resolve(__dirname, 'node_modules/react-native-worklets/.worklets'),
];

config = getBundleModeMetroConfig(config);

module.exports = config;
