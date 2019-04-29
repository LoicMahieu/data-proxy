import cors from "cors";
import express from "express";
import morgan from "morgan";
import { applyMiddlewares, authBaseMap, beforeCheckPermissions } from "../src";
import { BackendGitlab } from "../src/backend/gitlab";

const app = express();

app.use(morgan("tiny"));
app.use(cors());

applyMiddlewares(app, {
  backend: new BackendGitlab({
    privateToken: process.env.GITLAB_PRIVATE_TOKEN || "",
  }),
  before: beforeCheckPermissions({
    pathMatch: "data/**/*",
    projectId: "LoicMahieu/test-react-admin",
  }),
  ...authBaseMap({
    getAuthMap: async () => ({
      loic: "$2b$10$4Dj1OSSTi4WwIRjbVtbYlupzpNPTjsmqkwMRrIO1oBKGpRv3Zxx0S",
    }),
    jwtSecret: "foobar",
  }),
});

app.listen(3001);
