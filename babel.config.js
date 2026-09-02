module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated 4 re-exports this plugin; Bundle Mode options live here.
      // worklets 0.10 uses importForwarding.moduleNames (not workletizableModules).
      [
        'react-native-worklets/plugin',
        {
          bundleMode: true,
          importForwarding: {
            moduleNames: ['remend'],
          },
        },
      ],
    ],
  };
};
