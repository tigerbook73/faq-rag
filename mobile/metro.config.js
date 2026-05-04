/* eslint-disable @typescript-eslint/no-require-imports */

const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");
const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

const forcedMobilePackages = new Set(["react", "react-dom"]);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const packageName = moduleName.startsWith("@")
    ? moduleName.split("/").slice(0, 2).join("/")
    : moduleName.split("/")[0];

  if (forcedMobilePackages.has(packageName)) {
    const target = path.join(projectRoot, "node_modules", moduleName);
    return context.resolveRequest(context, target, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
