import bodyParser, { OptionsJson } from "body-parser";
import { Application, ErrorRequestHandler } from "express";
import asyncHandler from "express-async-handler";
import { ICommitBody, IServerOptions, IServerOptionsForRequest } from "./types";
import { badRequest, isBoom, unauthorized } from "@hapi/boom";

const makeOptionsForRequest: (
  serverOptions: IServerOptions,
) => IServerOptionsForRequest = (serverOptions) => async (req) => {
  return {
    ...serverOptions,
    auth:
      typeof serverOptions.auth === "function"
        ? serverOptions.auth(req)
        : serverOptions.auth,
    backend:
      typeof serverOptions.backend === "function"
        ? serverOptions.backend(req)
        : serverOptions.backend,
  };
};

export function applyMiddlewares(
  app: Application,
  serverOptions: IServerOptions,
) {
  const prefix = serverOptions.prefix || "";
  const projectId = encodeURIComponent(serverOptions.projectId);
  const bodyParserOptions: OptionsJson = serverOptions.bodyParserOptions || {
    limit: "50mb",
  };

  const serverOptionsForRequest = makeOptionsForRequest(serverOptions);

  app.head(
    `${prefix}/__data-proxy__/${projectId}/authenticate-check`,
    authenticateCheck(serverOptionsForRequest),
  );
  app.post(
    `${prefix}/__data-proxy__/${projectId}/authenticate`,
    bodyParser.json(bodyParserOptions),
    authenticate(serverOptionsForRequest),
  );
  app.get(
    `${prefix}/__data-proxy__/${projectId}/permissions`,
    getPermissions(serverOptionsForRequest),
  );

  app.get(
    `${prefix}/api/v4/projects/${projectId}/repository/tree`,
    tree(serverOptionsForRequest),
  );
  app.get(
    `${prefix}/api/v4/projects/${projectId}/repository/files/:file/raw`,
    readFileRaw(serverOptionsForRequest),
  );
  app.get(
    `${prefix}/api/v4/projects/${projectId}/repository/files/*`,
    readFile(serverOptionsForRequest),
  );
  app.head(
    `${prefix}/api/v4/projects/${projectId}/repository/files/*`,
    headFile(serverOptionsForRequest),
  );
  app.post(
    `${prefix}/api/v4/projects/${projectId}/repository/commits`,
    bodyParser.json(bodyParserOptions),
    commit(serverOptionsForRequest),
  );
  app.get(
    `${prefix}/api/v4/projects/${projectId}/repository/branches/:ref`,
    bodyParser.json(bodyParserOptions),
    branch(serverOptionsForRequest),
  );

  app.get(
    `${prefix}/api/v4/projects/${projectId}/pipelines`,
    listPipelines(serverOptionsForRequest),
  );
  app.get(
    `${prefix}/api/v4/projects/${projectId}/pipelines/:id`,
    getPipeline(serverOptionsForRequest),
  );
  app.post(
    `${prefix}/api/v4/projects/${projectId}/pipeline`,
    triggerPipeline(serverOptionsForRequest),
  );

  const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
    if (isBoom(err)) {
      res.set(err.output.headers);
      res.status(err.output.statusCode).send(err.output.payload);
      return;
    }
    next(err);
  };

  app.use(errorHandler);
}

const authenticate = (getServerOptions: IServerOptionsForRequest) =>
  asyncHandler(async (req, res) => {
    const serverOptions = await getServerOptions(req);

    if (serverOptions.before) {
      await serverOptions.before({});
    }

    const token = await serverOptions.auth.authLogin(req.body);

    if (!token) {
      throw unauthorized();
    }

    res.send({ token });
  });

const authenticateCheck = (getServerOptions: IServerOptionsForRequest) =>
  asyncHandler(async (req, res) => {
    const serverOptions = await getServerOptions(req);

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
      throw unauthorized();
    }

    res.send("");
  });

const tree = (getServerOptions: IServerOptionsForRequest) =>
  asyncHandler(async (req, res) => {
    const serverOptions = await getServerOptions(req);
    const { path, page, ref } = req.query;
    const { projectId } = serverOptions;
    const authorization = req.get("Authorization");

    if (serverOptions.before) {
      await serverOptions.before({
        path: path?.toString(),
        ref: ref?.toString(),
      });
    }

    if (
      !authorization ||
      !(await serverOptions.auth.authCheck(authorization))
    ) {
      throw unauthorized();
    }

    const { body, headers } = await serverOptions.backend.tree({
      page: page?.toString() || "1",
      path: path?.toString() || "",
      projectId,
      ref: ref?.toString() || "",
    });

    res.set(headers);
    res.send(body.filter((file) => file.name !== ".empty"));
  });

const readFile = (getServerOptions: IServerOptionsForRequest) =>
  asyncHandler(async (req, res) => {
    const serverOptions = await getServerOptions(req);
    const file = req.params["0"];
    const { ref } = req.query;
    const { projectId } = serverOptions;
    const authorization = req.get("Authorization");

    if (serverOptions.before) {
      await serverOptions.before({
        path: file,
        ref: ref?.toString(),
      });
    }

    if (
      !authorization ||
      !(await serverOptions.auth.authCheck(authorization))
    ) {
      throw unauthorized();
    }

    const { body, headers } = await serverOptions.backend.readFile({
      file,
      projectId,
      ref: ref?.toString() || "",
    });

    res.set(headers);
    res.send(body);
  });

const readFileRaw = (getServerOptions: IServerOptionsForRequest) =>
  asyncHandler(async (req, res) => {
    const serverOptions = await getServerOptions(req);
    const file = req.params.file;
    const { ref } = req.query;
    const { projectId } = serverOptions;
    const authorization = req.get("Authorization");

    if (serverOptions.before) {
      await serverOptions.before({
        path: file,
        ref: ref?.toString() || "",
      });
    }

    if (
      !authorization ||
      !(await serverOptions.auth.authCheck(authorization))
    ) {
      throw unauthorized();
    }

    const stream = await serverOptions.backend.readFileRaw({
      file,
      projectId,
      ref: ref?.toString() || "",
    });

    stream.pipe(res);
  });

const headFile = (getServerOptions: IServerOptionsForRequest) =>
  asyncHandler(async (req, res) => {
    const serverOptions = await getServerOptions(req);
    const file = req.params["0"];
    const { ref } = req.query;
    const { projectId } = serverOptions;
    const authorization = req.get("Authorization");

    if (serverOptions.before) {
      await serverOptions.before({
        path: file,
        ref: ref?.toString() || "",
      });
    }

    if (
      !authorization ||
      !(await serverOptions.auth.authCheck(authorization))
    ) {
      throw unauthorized();
    }

    const { headers } = await serverOptions.backend.headFile({
      file,
      projectId,
      ref: ref?.toString() || "",
    });

    res.set(headers);
    res.end();
  });

const commit = (getServerOptions: IServerOptionsForRequest) =>
  asyncHandler(async (req, res) => {
    const serverOptions = await getServerOptions(req);
    const commitBody: ICommitBody = req.body;
    const { projectId } = serverOptions;
    const authorization = req.get("Authorization");

    if (
      !commitBody ||
      !commitBody.branch ||
      !commitBody.actions ||
      !commitBody.actions[0]
    ) {
      throw badRequest();
    }

    if (serverOptions.before) {
      await serverOptions.before({
        path: commitBody.actions[0].file_path,
        ref: commitBody.branch,
      });
    }

    if (!authorization) {
      throw unauthorized();
    }

    const authData = await serverOptions.auth.authCheck(authorization);

    if (!authorization || !authData) {
      throw unauthorized();
    }

    let beforeCommitResult: ICommitBody | undefined | void = undefined;
    if (serverOptions.beforeCommit) {
      beforeCommitResult = await serverOptions.beforeCommit(
        commitBody,
        authData,
      );
    }

    const { body, headers } = await serverOptions.backend.commit({
      commitBody: beforeCommitResult || commitBody,
      projectId,
    });

    res.set(headers);
    res.send(body);
  });

const listPipelines = (getServerOptions: IServerOptionsForRequest) =>
  asyncHandler(async (req, res) => {
    const serverOptions = await getServerOptions(req);
    const authorization = req.get("Authorization");
    const { ref } = req.query;
    const { projectId } = serverOptions;

    if (serverOptions.before) {
      await serverOptions.before({
        ref: ref?.toString() || "",
      });
    }

    if (
      !authorization ||
      !(await serverOptions.auth.authCheck(authorization))
    ) {
      throw unauthorized();
    }

    const { body, headers } = await serverOptions.backend.listPipelines({
      projectId,
      ref: ref?.toString() || "",
    });

    res.set(headers);
    res.send(body);
  });

const triggerPipeline = (getServerOptions: IServerOptionsForRequest) =>
  asyncHandler(async (req, res) => {
    const serverOptions = await getServerOptions(req);
    const authorization = req.get("Authorization");
    const { ref } = req.query;
    const { projectId } = serverOptions;

    if (serverOptions.before) {
      await serverOptions.before({
        ref: ref?.toString() || "",
      });
    }

    if (
      !authorization ||
      !(await serverOptions.auth.authCheck(authorization))
    ) {
      throw unauthorized();
    }

    const { body, headers } = await serverOptions.backend.triggerPipeline({
      projectId,
      ref: ref?.toString() || "",
    });

    res.set(headers);
    res.send(body);
  });

const getPipeline = (getServerOptions: IServerOptionsForRequest) =>
  asyncHandler(async (req, res) => {
    const serverOptions = await getServerOptions(req);
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
      throw unauthorized();
    }

    const { body, headers } = await serverOptions.backend.getPipeline({
      id: `${id}`,
      projectId,
    });

    res.set(headers);
    res.send(body);
  });

const branch = (getServerOptions: IServerOptionsForRequest) =>
  asyncHandler(async (req, res) => {
    const serverOptions = await getServerOptions(req);
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
      throw unauthorized();
    }

    const { body, headers } = await serverOptions.backend.showBranch({
      projectId,
      ref: `${ref}`,
    });

    res.set(headers);
    res.send(body);
  });

const getPermissions = (getServerOptions: IServerOptionsForRequest) =>
  asyncHandler(async (req, res) => {
    const serverOptions = await getServerOptions(req);
    const authorization = req.get("Authorization");
    if (serverOptions.before) {
      await serverOptions.before({});
    }

    const tokenData =
      authorization && (await serverOptions.auth.authCheck(authorization));

    if (!tokenData) {
      throw unauthorized();
    }

    const permissions = serverOptions.getPermissions
      ? await serverOptions.getPermissions(tokenData)
      : [];

    res.send(permissions);
  });
