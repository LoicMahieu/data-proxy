import bodyParser from "body-parser";
import { Application } from "express";
import asyncHandler from "express-async-handler";

interface IOptions {
  cwd: string;
  prefix?: string;
}

// Copied from node-gitlab
export interface ICommitAction {
  /** The action to perform */
  action: "create" | "delete" | "move" | "update";
  /** Full path to the file. Ex. lib/class.rb */
  file_path: string;
  /** File content, required for all except delete. Optional for move */
  content?: string;
  /** text or base64. text is default. */
  encoding?: string;
}

export async function applyMiddlewares(app: Application, options: IOptions) {
  const prefix = options.prefix || "";

  app.get(
    `${prefix}/api/v4/projects/:projectId/repository/tree`,
    tree(options),
  );
  app.get(
    `${prefix}/api/v4/projects/:projectId/repository/files/*`,
    readFile(options),
  );
  app.post(
    `${prefix}/api/v4/projects/:projectId/repository/commits`,
    bodyParser.json(),
    commit(options),
  );
}

const tree = (options: IOptions) =>
  asyncHandler(async (req, res, next) => {
    const basePath = req.query.path;
    console.log(basePath)
    res.send([]);
  });

const readFile = (options: IOptions) =>
  asyncHandler(async (req, res, next) => {
    const file = req.params["0"]
    console.log(file)

    res.send({});
  });

const commit = (options: IOptions) =>
  asyncHandler(async (req, res, next) => {
    const actions: ICommitAction[] = req.body.actions || [];
    console.log(actions)
    res.send({ ok: true });
  });
