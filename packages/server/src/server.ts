import bodyParser, { OptionsJson } from "body-parser";
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
  const bodyParserOptions: OptionsJson = serverOptions.bodyParserOptions || {
    limit: "50mb",
  };

  app.head(
    `${prefix}/__data-proxy__/${projectId}/authenticate-check`,
    authenticateCheck(serverOptions),
  );
  app.post(
    `${prefix}/__data-proxy__/${projectId}/authenticate`,
    bodyParser.json(bodyParserOptions),
    authenticate(serverOptions),
  );
  app.get(
    `${prefix}/__data-proxy__/${projectId}/permissions`,
    getPermissions(serverOptions),
  );

  app.get(
    `${prefix}/api/v4/projects/${projectId}/repository/tree`,
    tree(serverOptions),
  );
  app.get(
    `${prefix}/api/v4/projects/${projectId}/repository/files/:file/raw`,
    readFileRaw(serverOptions),
  );
  app.get(
    `${prefix}/api/v4/projects/${projectId}/repository/files/*`,
    readFile(serverOptions),
  );
  app.head(
    `${prefix}/api/v4/projects/${projectId}/repository/files/*`,
    headFile(serverOptions),
  );
  app.post(
    `${prefix}/api/v4/projects/${projectId}/repository/commits`,
    bodyParser.json(bodyParserOptions),
    commit(serverOptions),
  );
  app.get(
    `${prefix}/api/v4/projects/${projectId}/repository/branches/:ref`,
    bodyParser.json(bodyParserOptions),
    branch(serverOptions),
  );

  app.get(
    `${prefix}/api/v4/projects/${projectId}/pipelines`,
    listPipelines(serverOptions),
  );
  app.get(
    `${prefix}/api/v4/projects/${projectId}/pipelines/:id`,
    getPipeline(serverOptions),
  );
  app.post(
    `${prefix}/api/v4/projects/${projectId}/pipeline`,
    triggerPipeline(serverOptions),
  );

  const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
    if (Boom.isBoom(err)) {
      res.set(err.output.headers);
      res.status(err.output.statusCode).send(err.output.payload);
      return;
    }
    if (err.gotOptions) {
      res.status(err.statusCode).send(err.body);
      return;
    }
    next(err);
  };

  app.use(errorHandler);
}

const authenticate = (serverOptions: IServerOptions) =>
  asyncHandler(async (req, res) => {
    if (serverOptions.before) {
      await serverOptions.before({});
    }

    const token = await serverOptions.auth.authLogin(req.body);

    if (!token) {
      throw Boom.unauthorized();
    }

    res.send({ token });
  });

const authenticateCheck = (serverOptions: IServerOptions) =>
  asyncHandler(async (req, res) => {
    if (serverOptions.before) {
      await serverOptions.before({});
    }

    const authorization = req.get("Authorization");

    if (serverOptions.before) {
      await serverOptions.before({});
    }

    if (
      !authorization ||
      !(await serverOptions.auth.authCheck(authorization))
    ) {
      throw Boom.unauthorized();
    }

    res.send();
  });

const tree = (serverOptions: IServerOptions) =>
  asyncHandler(async (req, res) => {
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
  asyncHandler(async (req, res) => {
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

const readFileRaw = (serverOptions: IServerOptions) =>
  asyncHandler(async (req, res) => {
    const file = req.params.file;
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

    const stream = await serverOptions.backend.readFileRaw({
      file,
      projectId,
      ref,
    });

    stream.pipe(res);
  });

const headFile = (serverOptions: IServerOptions) =>
  asyncHandler(async (req, res) => {
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

    const { headers } = await serverOptions.backend.headFile({
      file,
      projectId,
      ref,
    });

    res.set(headers);
    res.end();
  });

const commit = (serverOptions: IServerOptions) =>
  asyncHandler(async (req, res) => {
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

    if (!authorization) {
      throw Boom.unauthorized();
    }

    const authData = await serverOptions.auth.authCheck(authorization);

    if (!authorization || !authData) {
      throw Boom.unauthorized();
    }

    let beforeCommitResult: void | ICommitBody;
    if (serverOptions.beforeCommit) {
      beforeCommitResult = await serverOptions.beforeCommit(
        commitBody,
        authData,
      );
    }

    const { body, headers } = await serverOptions.backend.commit({
      commitBody: beforeCommitResult ? beforeCommitResult : commitBody,
      projectId,
    });

    res.set(headers);
    res.send(body);
  });

const listPipelines = (serverOptions: IServerOptions) =>
  asyncHandler(async (req, res) => {
    const authorization = req.get("Authorization");
    const { ref } = req.query;
    const { projectId } = serverOptions;

    if (serverOptions.before) {
      await serverOptions.before({
        ref,
      });
    }

    if (
      !authorization ||
      !(await serverOptions.auth.authCheck(authorization))
    ) {
      throw Boom.unauthorized();
    }

    const { body, headers } = await serverOptions.backend.listPipelines({
      projectId,
      ref,
    });

    res.set(headers);
    res.send(body);
  });

const triggerPipeline = (serverOptions: IServerOptions) =>
  asyncHandler(async (req, res) => {
    const authorization = req.get("Authorization");
    const { ref } = req.query;
    const { projectId } = serverOptions;

    if (serverOptions.before) {
      await serverOptions.before({
        ref,
      });
    }

    if (
      !authorization ||
      !(await serverOptions.auth.authCheck(authorization))
    ) {
      throw Boom.unauthorized();
    }

    const { body, headers } = await serverOptions.backend.triggerPipeline({
      projectId,
      ref,
    });

    res.set(headers);
    res.send(body);
  });

const getPipeline = (serverOptions: IServerOptions) =>
  asyncHandler(async (req, res) => {
    const authorization = req.get("Authorization");
    const { id } = req.params;
    const { projectId } = serverOptions;

    if (serverOptions.before) {
      await serverOptions.before({});
    }

    if (
      !authorization ||
      !(await serverOptions.auth.authCheck(authorization))
    ) {
      throw Boom.unauthorized();
    }

    const { body, headers } = await serverOptions.backend.getPipeline({
      id: `${id}`,
      projectId,
    });

    res.set(headers);
    res.send(body);
  });

const branch = (serverOptions: IServerOptions) =>
  asyncHandler(async (req, res) => {
    const authorization = req.get("Authorization");
    const { ref } = req.params;
    const { projectId } = serverOptions;

    if (serverOptions.before) {
      await serverOptions.before({});
    }

    if (
      !authorization ||
      !(await serverOptions.auth.authCheck(authorization))
    ) {
      throw Boom.unauthorized();
    }

    const { body, headers } = await serverOptions.backend.showBranch({
      projectId,
      ref: `${ref}`,
    });

    res.set(headers);
    res.send(body);
  });

const getPermissions = (serverOptions: IServerOptions) =>
  asyncHandler(async (req, res) => {
    const authorization = req.get("Authorization");
    if (serverOptions.before) {
      await serverOptions.before({});
    }

    const tokenData =
      authorization && (await serverOptions.auth.authCheck(authorization));

    if (!tokenData) {
      throw Boom.unauthorized();
    }

    const permissions = serverOptions.getPermissions
      ? await serverOptions.getPermissions(tokenData)
      : [];

    res.send(permissions);
  });
