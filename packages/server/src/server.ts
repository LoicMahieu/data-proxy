import bodyParser from "body-parser";
import Boom from "boom";
import { Application, ErrorRequestHandler } from "express";
import asyncHandler from "express-async-handler";
import { ICommitBody, IServerOptions } from "./types";

export async function applyMiddlewares(
  app: Application,
  serverOptions: IServerOptions,
) {
  const prefix = serverOptions.prefix || "";
  const projectId = encodeURIComponent(serverOptions.projectId);

  app.post(
    `${prefix}/__data-proxy__/${projectId}/authenticate`,
    bodyParser.json(),
    authenticate(serverOptions),
  );

  app.get(
    `${prefix}/api/v4/projects/${projectId}/repository/tree`,
    tree(serverOptions),
  );
  app.get(
    `${prefix}/api/v4/projects/${projectId}/repository/files/*`,
    readFile(serverOptions),
  );
  app.post(
    `${prefix}/api/v4/projects/${projectId}/repository/commits`,
    bodyParser.json(),
    commit(serverOptions),
  );

  const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
    if (Boom.isBoom(err)) {
      res.set(err.output.headers);
      res.status(err.output.statusCode).send(err.output.payload);
      return;
    }
    next(err);
  };

  app.use(errorHandler);
}

const authenticate = (serverOptions: IServerOptions) =>
  asyncHandler(async (req, res, next) => {
    if (serverOptions.before) {
      await serverOptions.before({});
    }

    const token = await serverOptions.auth.authLogin(req.body);

    if (!token) {
      throw Boom.unauthorized();
    }

    res.send({ token });
  });

const tree = (serverOptions: IServerOptions) =>
  asyncHandler(async (req, res, next) => {
    const { path, page, ref } = req.query;
    const { projectId } = serverOptions;
    const authorization = req.get("Authorization");

    if (serverOptions.before) {
      await serverOptions.before({
        path,
        ref,
      });
    }

    if (
      !authorization ||
      !(await serverOptions.auth.authCheck(authorization))
    ) {
      throw Boom.unauthorized();
    }

    const { body, headers } = await serverOptions.backend.tree({
      page,
      path,
      projectId,
      ref,
    });

    res.set(headers);
    res.send(body);
  });

const readFile = (serverOptions: IServerOptions) =>
  asyncHandler(async (req, res, next) => {
    const file = req.params["0"];
    const { ref } = req.query;
    const { projectId } = serverOptions;
    const authorization = req.get("Authorization");

    if (serverOptions.before) {
      await serverOptions.before({
        path: file,
        ref,
      });
    }

    if (
      !authorization ||
      !(await serverOptions.auth.authCheck(authorization))
    ) {
      throw Boom.unauthorized();
    }

    const { body, headers } = await serverOptions.backend.readFile({
      file,
      projectId,
      ref,
    });

    res.set(headers);
    res.send(body);
  });

const commit = (serverOptions: IServerOptions) =>
  asyncHandler(async (req, res, next) => {
    const commitBody: ICommitBody = req.body;
    const { projectId } = serverOptions;
    const authorization = req.get("Authorization");

    if (
      !commitBody ||
      !commitBody.branch ||
      !commitBody.actions ||
      !commitBody.actions[0]
    ) {
      throw Boom.badRequest();
    }

    if (serverOptions.before) {
      await serverOptions.before({
        path: commitBody.actions[0].file_path,
        ref: commitBody.branch,
      });
    }

    if (
      !authorization ||
      !(await serverOptions.auth.authCheck(authorization))
    ) {
      throw Boom.unauthorized();
    }

    const { body, headers } = await serverOptions.backend.commit({
      commitBody,
      projectId,
    });

    res.set(headers);
    res.send(body);
  });
