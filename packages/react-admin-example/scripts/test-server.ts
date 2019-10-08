import { backendGitlab } from "@data-proxy/server";
import { authOmnipartners } from "@data-proxy/server-auth-omnipartners";
import { applyMiddlewares, backendFilesystem } from "@data-proxy/server/src";
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

    auth: authOmnipartners({
      jwtSecret: "xxxxxxxx",
      omnipartners: omnipartners(
        JSON.parse(process.env.OMNIPARTNERS_CONFIG || ""),
      ),
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
    prefix: "",
    projectId: process.env.GITLAB_PROJECT_ID || "",
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
        JSON.parse(process.env.OMNIPARTNERS_CONFIG || ""),
      ),
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
    prefix: "",
    projectId: process.env.GITLAB_PROJECT_ID || "",
  });

  return app;
};

applyGitlab(express().use(morgan("tiny"))).listen(3001);
