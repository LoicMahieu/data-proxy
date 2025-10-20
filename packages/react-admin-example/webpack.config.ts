import webpack from "webpack";
import HtmlWebpackPlugin from "html-webpack-plugin";
import "webpack-dev-server";
import { WebpackConfiguration } from "webpack-dev-server";
import path from "path";

const config: WebpackConfiguration = {
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    fallback: {
      path: require.resolve("path-browserify"),
      querystring: false,
    },
  },
  mode: "development",
  plugins: [
    new HtmlWebpackPlugin({
      title: "Sample",
    }),
    new webpack.DefinePlugin({
      "process.env": {
        GITLAB_API: JSON.stringify(process.env.GITLAB_API),
        GITLAB_OAUTH_CLIENT_ID: JSON.stringify(
          process.env.GITLAB_OAUTH_CLIENT_ID,
        ),
        GITLAB_OAUTH_BASE_URL: JSON.stringify(
          process.env.GITLAB_OAUTH_BASE_URL,
        ),
        GITLAB_PROJECT_ID: JSON.stringify(process.env.GITLAB_PROJECT_ID),
        GITLAB_REF: JSON.stringify(process.env.GITLAB_REF),
        REACT_ADMIN_DATA_API: "/admin/",
        GITLAB_DATA_BASE_PATH: JSON.stringify(
          process.env.GITLAB_DATA_BASE_PATH || "data",
        ),
      },
    }),
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
    }),
  ],
  devServer: {
    historyApiFallback: true,
    hot: false,
    port: 3000,
    host: "0.0.0.0",
    proxy: [
      {
        context: ["/admin"],
        target: "http://localhost:3001",
        changeOrigin: true,
        pathRewrite: { "^/admin": "" },
        secure: false,
      },
    ],
    static: {
      directory: "./app",
    },
  },
};

export default config;
