const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

const nativeWindConfig = withNativeWind(config, { input: "./global.css" });

nativeWindConfig.resolver.sourceExts = [...nativeWindConfig.resolver.sourceExts, "md"];
nativeWindConfig.transformer.babelTransformerPath = require.resolve("./metro.transformer.js");

module.exports = nativeWindConfig;
