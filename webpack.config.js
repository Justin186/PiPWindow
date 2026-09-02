const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

const isProduction = process.env.NODE_ENV == "production";

const config = {
  entry: "./src/main.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "main.js",
    clean: true,
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, "src", "manifest.json"),
          to: path.resolve(__dirname, "dist", "manifest.json"),
        },
        {
          from: path.resolve(__dirname, "src", "preview.webp"),
          to: path.resolve(__dirname, "dist", "preview.webp"),
          noErrorOnMissing: true,
        },
        {
          from: path.resolve(__dirname, "src", "preview.png"),
          to: path.resolve(__dirname, "dist", "preview.png"),
          noErrorOnMissing: true,
        },
        {
          from: path.resolve(__dirname, "domWindowStyle.ps1"),
          to: path.resolve(__dirname, "dist", "domWindowStyle.ps1"),
        },
      ],
    }),
  ],
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/i,
        exclude: /node_modules/,
        loader: "babel-loader",
      },
    ],
  },
  optimization: {
    minimize: isProduction,
  },
};

module.exports = () => {
  config.mode = isProduction ? "production" : "development";
  return config;
};
