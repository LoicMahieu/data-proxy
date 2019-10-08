const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  module: {
    rules: [{ test: /\.js$/, exclude: /node_modules/, loader: "babel-loader" }],
  },
  mode: "development",
  plugins: [
    new HtmlWebpackPlugin({
      title: "Sample",
    }),
    new webpack.DefinePlugin({
      'process.env': {
        'GITLAB_API': JSON.stringify(process.env.GITLAB_API),
        'GITLAB_OAUTH_CLIENT_ID': JSON.stringify(process.env.GITLAB_OAUTH_CLIENT_ID),
        'GITLAB_OAUTH_BASE_URL': JSON.stringify(process.env.GITLAB_OAUTH_BASE_URL),
        'GITLAB_PROJECT_ID': JSON.stringify(process.env.GITLAB_PROJECT_ID),
        'GITLAB_REF': JSON.stringify(process.env.GITLAB_REF),
        'REACT_ADMIN_DATA_API': '/admin/',
        'GITLAB_DATA_BASE_PATH': JSON.stringify(process.env.GITLAB_DATA_BASE_PATH || 'data')
      },
    }),
  ],
  devServer: {
    historyApiFallback: true,
    hot: false,
    inline: true,
    contentBase: "./app",
    port: 3000,
    host: "0.0.0.0",
    disableHostCheck: true,
    proxy: {
      '/admin': {
        target: 'http://localhost:3001',
        pathRewrite: {'^/admin' : ''}
      }
    },
  },
};
