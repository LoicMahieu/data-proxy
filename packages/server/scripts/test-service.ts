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

import { authOmnipartners, verifyUserFromFileList } from "@git-data-proxy/server-auth-omnipartners";
import omnipartners from "omnipartners";

const app = express();

app.use(morgan("tiny"));
app.use(cors());

// const backend = backendGitlab({
//   privateToken: process.env.GITLAB_PRIVATE_TOKEN || "",
// });

const backend = backendFilesystem({
  cwd: "/Users/loicmahieu/Projects/test-react-admin"
});

// const auth = authBackendFileList({
//   backend,
//   // authMap: {
//   //   loic: "$2b$10$4Dj1OSSTi4WwIRjbVtbYlupzpNPTjsmqkwMRrIO1oBKGpRv3Zxx0S",
//   // }
//   jwtSecret: "foobar",
//   path: "data/users",
//   projectId: "LoicMahieu/test-react-admin",
//   ref: "master",
// })

const auth = authOmnipartners({
  jwtSecret: "foobar",
  omnipartners: omnipartners({
    cis: {
      host: "https://XX.clixray.io",
      key: "XX",
      secret: "XX",
    }
  }),
  verifyUser: verifyUserFromFileList({
    backend,
    path: "data/users",
    projectId: "LoicMahieu/test-react-admin",
    ref: "master",
  })
});

applyMiddlewares(app, {
  auth,
  backend,
  before: beforeCheckPermissions({
    pathMatch: "data/**/*",
  }),
  projectId: "LoicMahieu/test-react-admin",
});

app.listen(3001);
