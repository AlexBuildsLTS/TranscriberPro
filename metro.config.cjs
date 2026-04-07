const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');
const fs = require('fs');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// 1. SVG Transformer Setup
config.transformer.babelTransformerPath =
  require.resolve('react-native-svg-transformer');
config.resolver.assetExts = config.resolver.assetExts.filter(
  (ext) => ext !== 'svg',
);
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'svg',
  'cjs',
  'mjs',
]; // Added cjs/mjs for Gemini SDK

// 2. Module Resolution & Paths
config.resolver.nodeModulesPaths = [path.resolve(__dirname, './node_modules')];
config.resolver.extraNodeModules = {
  'react-native-svg': path.resolve(
    __dirname,
    './node_modules/react-native-svg',
  ),
};

// 3. Transformer Options
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: false,
  },
});

// 4. Force CJS resolution for packages whose ESM builds use import.meta (web)
const zustandRoot = path.dirname(require.resolve('zustand/package.json'));
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && (moduleName === 'zustand' || moduleName.startsWith('zustand/'))) {
    const subpath = moduleName === 'zustand' ? 'index' : moduleName.slice('zustand/'.length);
    const cjsPath = path.join(zustandRoot, `${subpath}.js`);
    if (fs.existsSync(cjsPath)) {
      return { filePath: cjsPath, type: 'sourceFile' };
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

// 5. Wrap with NativeWind
module.exports = withNativeWind(config, {
  input: './global.css',
  projectRoot: __dirname,
  inlineRem: 16,
});
