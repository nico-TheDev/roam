const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");
const { resolve } = require("metro-resolver");

/** @type {import('expo/metro-config').MetroConfig} */
const config = withNativewind(getDefaultConfig(__dirname));

// NativeWind reroutes `react-native` imports through its own wrapper, which does not
// re-export AssetRegistry. expo-asset needs it to load fonts, so give these packages
// the real module.
const nativewindResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === "react-native" &&
    /node_modules[\\/](expo-asset|expo-font)[\\/]/.test(context.originModulePath)
  ) {
    return resolve({ ...context, resolveRequest: undefined }, moduleName, platform);
  }
  return nativewindResolver(context, moduleName, platform);
};

module.exports = config;
