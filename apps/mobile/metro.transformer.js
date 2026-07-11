const upstreamTransformer = require("@expo/metro-config/babel-transformer");

module.exports.transform = function transform(args) {
  if (args.filename.endsWith(".md")) {
    return upstreamTransformer.transform({
      ...args,
      src: `module.exports = ${JSON.stringify(args.src)};`,
    });
  }

  return upstreamTransformer.transform(args);
};

module.exports.getCacheKey = upstreamTransformer.getCacheKey;
