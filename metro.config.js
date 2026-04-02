/**
 * metro.config.js
 * ══════════════════════════════════════════════════════════════════════════════
 * Official Expo + NativeWind v4 configuration.
 * Stripped of conflicting legacy resolvers to ensure stable CSS interop on web.
 */
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.nodeModulesPaths = [path.resolve(__dirname, './node_modules')];

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = withNativeWind(config, {
  input: './global.css',
  projectRoot: __dirname,
  inlineRem: 16,
});
