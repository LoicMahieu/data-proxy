import cors from "cors";
import express from "express";
import morgan from "morgan";
import { applyMiddlewares, authBackendFileList, authBaseMap, beforeCheckPermissions } from "../src";
import { backendGitlab } from "../src/backend/gitlab";

const app = express();

app.use(morgan("tiny"));
app.use(cors());

applyMiddlewares(app, {
  auth: authBackendFileList({
    backend: backendGitlab({
      privateToken: process.env.GITLAB_PRIVATE_TOKEN || "",
    }),
    jwtSecret: "foobar",
    path: "data/users",
    projectId: "LoicMahieu/test-react-admin",
    ref: "master",
  }),
  backend: backendGitlab({
    privateToken: process.env.GITLAB_PRIVATE_TOKEN || "",
  }),
  before: beforeCheckPermissions({
    pathMatch: "data/**/*",
  }),
  projectId: "LoicMahieu/test-react-admin",
});

app.listen(3001);
