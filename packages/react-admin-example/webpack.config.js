const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const {
  applyMiddlewares,
  backendGitlab,
  backendFilesystem
} = require("@data-proxy/server");
const {
  authOmnipartners,
} = require("@data-proxy/server-auth-omnipartners")
const omnipartners = require('omnipartners').default
const get = require('lodash/get')

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
    before: app => {
      applyMiddlewares(app, {
        backend: backendFilesystem({
          cwd: __dirname
        }),
        auth: authOmnipartners({
          jwtSecret: "xxxxxxxx",
          omnipartners: omnipartners(JSON.parse(process.env.OMNIPARTNERS_CONFIG)),
          // verifyUser: verifyUserFromFileList({
          //   backend,
          //   path: `${process.env.DATASTORE_BASE_PATH}/adminUsers`,
          //   projectId: process.env.GITLAB_PROJECT_ID || "",
          //   ref: process.env.GITLAB_REF || "",
          // }),
        }),
        beforeCommit: async (commit, authData) => ({
          ...commit,
          author_email: get(authData, "user.owner.email"),
          author_name: `${get(authData, "user.owner.firstName")} ${get(
            authData,
            "user.owner.lastName",
          )} (${get(authData, "user.owner.guid")})`,
        }),
        prefix: '/admin/',
        projectId: process.env.GITLAB_PROJECT_ID,
      });
    },
    // before: app => {
    //   applyMiddlewares(app, {
    //     backend: backendGitlab({
    //       privateToken: process.env.GITLAB_PRIVATE_TOKEN
    //     }),
    //     auth: authOmnipartners({
    //       jwtSecret: "xxxxxxxx",
    //       omnipartners: omnipartners(JSON.parse(process.env.OMNIPARTNERS_CONFIG)),
    //       // verifyUser: verifyUserFromFileList({
    //       //   backend,
    //       //   path: `${process.env.DATASTORE_BASE_PATH}/adminUsers`,
    //       //   projectId: process.env.GITLAB_PROJECT_ID || "",
    //       //   ref: process.env.GITLAB_REF || "",
    //       // }),
    //     }),
    //     beforeCommit: async (commit, authData) => ({
    //       ...commit,
    //       author_email: get(authData, "user.owner.email"),
    //       author_name: `${get(authData, "user.owner.firstName")} ${get(
    //         authData,
    //         "user.owner.lastName",
    //       )} (${get(authData, "user.owner.guid")})`,
    //     }),
    //     prefix: '/admin/',
    //     projectId: process.env.GITLAB_PROJECT_ID,
    //   });
    // },
  },
};
