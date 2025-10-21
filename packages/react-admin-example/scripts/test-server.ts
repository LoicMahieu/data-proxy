import { backendGitlab } from "@data-proxy/server";
import { authOmnipartners } from "@data-proxy/server-auth-omnipartners";
import {
  applyMiddlewares,
  authBaseMap,
  backendFilesystem,
} from "@data-proxy/server/src";
import express, { Application } from "express";
import get from "lodash/get";
import morgan from "morgan";
import omnipartners from "omnipartners";
import { join } from "path";

const apply = (app: Application) => {
  applyMiddlewares(app, {
    backend: backendFilesystem({
      cwd: join(__dirname, ".."),
    }),

    auth: authBaseMap({
      authMap: {
        dev: "$2b$10$FbVbqQEQOA1SNxNpqGUVcu4oLOJmSdKC4m/tz/2RCflAOszVYwI/q", // dev
      },
      disableCheck: false,
      jwtSecret: "dev",
    }),
    // beforeCommit: async (commit, authData) => ({
    //   ...commit,
    //   author_email: get(authData, "user.owner.email"),
    //   author_name: `${get(authData, "user.owner.firstName")} ${get(
    //     authData,
    //     "user.owner.lastName",
    //   )} (${get(authData, "user.owner.guid")})`,
    // }),
    prefix: "",
    projectId: process.env.GIT_PROJECT_ID || "",

    getPermissions: tokenData => {
      console.log("Get permissions for ", { tokenData });
      return ["admin"];
    },
  });

  return app;
};

const applyGitlab = (app: Application) => {
  applyMiddlewares(app, {
    backend: backendGitlab({
      privateToken: process.env.GITLAB_PRIVATE_TOKEN || "",
    }),

    auth: authOmnipartners({
      jwtSecret: "xxxxxxxx",
      omnipartners: omnipartners(
        JSON.parse(process.env.CLIXRAY_CONFIG || ""),
      ),
      // verifyUser: verifyUserFromFileList({
      //   backend,
      //   path: `${process.env.DATASTORE_BASE_PATH}/adminUsers`,
      //   projectId: process.env.GIT_PROJECT_ID || "",
      //   ref: process.env.GIT_REF || "",
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
    prefix: "",
    projectId: process.env.GIT_PROJECT_ID || "",
  });

  return app;
};

apply(express().use(morgan("tiny"))).listen(3001);

console.log('Server listen to http://localhost:3001')
