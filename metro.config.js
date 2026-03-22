const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// 1. THE ZUSTAND KILL SWITCH (Essential for stability)
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'zustand' || moduleName.startsWith('zustand/')) {
    return {
      filePath: require.resolve(moduleName),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

// 2. Faster Resolution
config.resolver.nodeModulesPaths = [path.resolve(__dirname, './node_modules')];

// 3. The ONLY performance flag that matters (Faster App Startup)
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true, // This makes the app load screens faster!
  },
});

module.exports = withNativeWind(config, {
  input: './global.css',
  projectRoot: __dirname,
  inlineRem: 16,
});
