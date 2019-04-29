import cors from "cors";
import express from "express";
import morgan from "morgan";
import { applyMiddlewares, authBaseMap, optionsGetter } from "../src";

const app = express();

app.use(morgan("tiny"));
app.use(cors());

applyMiddlewares(app, {
  getOptions: optionsGetter({
    gitlab: {
      privateToken: process.env.GITLAB_PRIVATE_TOKEN || "",
    },
    pathMatch: "data/**/*",
    projectId: "LoicMahieu/test-react-admin",
    ...authBaseMap({
      getAuthMap: async () => ({
        loic: "$2b$10$4Dj1OSSTi4WwIRjbVtbYlupzpNPTjsmqkwMRrIO1oBKGpRv3Zxx0S",
      }),
      jwtSecret: "foobar",
    }),
  }),
});

app.listen(3001);
