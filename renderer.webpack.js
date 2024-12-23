const path = require("path");

module.exports = function (config) {
  // Create a fresh config object
  const newConfig = {
    ...config,
    resolve: {
      modules: [path.resolve(__dirname, "./src"), "node_modules"],
      extensions: [".ts", ".tsx", ".js", ".jsx"],
      alias: {
        "@app": path.resolve(__dirname, "./src/app"),
        "@renderer": path.resolve(__dirname, "./src/renderer"),
      },
    },
    externals: ["react", "react-dom"],
    optimization: {
      moduleIds: "named",
      chunkIds: "named",
    },
  };

  // Remove any Webpack 4 specific configurations
  delete newConfig.optimization.namedModules;
  delete newConfig.optimization.namedChunks;

  return newConfig;
};
