import cors from "cors";
import express from "express";
import morgan from "morgan";
import {
  applyMiddlewares,
  authBackendFileList,
  authBaseMap,
  backendFilesystem,
  backendGitlab,
  beforeCheckPermissions,
} from "../src";

import {
  authOmnipartners,
  verifyUserFromFileList,
} from "@data-proxy/server-auth-omnipartners";
import omnipartners from "omnipartners";
import { join } from "path";

const app = express();

app.use(morgan("tiny"));
app.use(cors());

const backendType: "gitlab" | "fs" = (process.env.BACKEND as any) || "fs";
const authType: "file" | "clixray" | "baseMap" =
  (process.env.AUTH as any) || "clixray";
const authShouldVerifyUser = process.env.AUTH_VERIF_USER === "1";

const JWTSECRET = "foobar";
const gitInfo = {
  path: "data/users",
  projectId: "LoicMahieu/test-react-admin",
  ref: "master",
};

const backendTypeGitlab = backendGitlab({
  privateToken: process.env.GITLAB_PRIVATE_TOKEN || "",
});

const backendTypeFs = backendFilesystem({
  cwd: join(__dirname, "../../react-admin-example"),
});

const backend = backendType === "gitlab" ? backendTypeGitlab : backendTypeFs;

const authFile = authBackendFileList({
  backend,
  // authMap: {
  //   loic: "$2b$10$4Dj1OSSTi4WwIRjbVtbYlupzpNPTjsmqkwMRrIO1oBKGpRv3Zxx0S",
  // }
  jwtSecret: JWTSECRET,
  ...gitInfo,
});

const authClixray = authOmnipartners({
  jwtSecret: JWTSECRET,
  omnipartners: omnipartners(
    JSON.parse(process.env.OMNIPARTNERS_CONFIG || "{}"),
  ),
  verifyUser: authShouldVerifyUser
    ? verifyUserFromFileList({
        backend,
        ...gitInfo,
      })
    : undefined,
});

const authTypeBaseMap = authBaseMap({
  authMap: {
    dev: "$2b$10$FbVbqQEQOA1SNxNpqGUVcu4oLOJmSdKC4m/tz/2RCflAOszVYwI/q", // dev
  },
  jwtSecret: JWTSECRET,
});

const auth =
  authType === "file"
    ? authFile
    : authType === "baseMap"
    ? authTypeBaseMap
    : authClixray;

applyMiddlewares(app, {
  auth,
  backend,
  before: beforeCheckPermissions({
    pathMatch: "data/**/*",
  }),
  projectId: gitInfo.projectId,
});

app.listen(3001, () => {
  console.log("Server listen http://localhost:3001");
});
