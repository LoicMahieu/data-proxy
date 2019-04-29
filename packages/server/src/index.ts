import bodyParser from "body-parser";
import Boom from "boom";
import { Application, ErrorRequestHandler, Request } from "express";
import asyncHandler from "express-async-handler";
import got from "got";
import pick from "lodash/pick";
import querystring from "querystring";
import { Omit } from "type-fest";

export interface IGetOptionsArg {
  path?: string;
  projectId: string;
  ref?: string;
}

interface IServerOptions {
  prefix?: string;
  getOptions: (data: IGetOptionsArg) => Promise<IOptions | undefined | null>;
}

export interface IOptions {
  gitlab: IOptionsGitlab;
  authCheck: (authorizationHeader: string) => Promise<boolean>;
  authLogin: (body: any) => Promise<string>;
}

export interface IOptionsGitlab {
  host?: string;
  timeout?: number;
  version?: string;
  privateToken: string;
}

const defaultGitlabOptions: Omit<IOptionsGitlab, "privateToken"> = {
  host: "https://gitlab.com",
  timeout: 30000,
  version: "v4",
};

const basePickHeaders = [
  "ratelimit-limit",
  "ratelimit-observed",
  "ratelimit-remaining",
  "ratelimit-reset",
  "ratelimit-resettime",
  "x-request-id",
  "x-runtime",
];

export interface ICommitAction {
  action: "create" | "delete" | "move" | "update";
  file_path: string;
  content?: string;
  encoding?: string;
}

interface ICommitBody {
  actions: ICommitAction[];
  branch: string;
  commit_message: string;
}

export async function applyMiddlewares(
  app: Application,
  serverOptions: IServerOptions,
) {
  const prefix = serverOptions.prefix || "";

  app.post(
    `${prefix}/__git-data-proxy__/:projectId/authenticate`,
    authenticate(serverOptions),
  );

  app.get(
    `${prefix}/api/v4/projects/:projectId/repository/tree`,
    tree(serverOptions),
  );
  app.get(
    `${prefix}/api/v4/projects/:projectId/repository/files/*`,
    readFile(serverOptions),
  );
  app.post(
    `${prefix}/api/v4/projects/:projectId/repository/commits`,
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
    const { projectId } = req.params;
    const options = await serverOptions.getOptions({
      projectId,
    });

    if (!options) {
      throw Boom.unauthorized();
    }

    const token = options.authLogin(req.body);
    res.send({ token });
  });

const tree = (serverOptions: IServerOptions) =>
  asyncHandler(async (req, res, next) => {
    const { path, page, ref } = req.query;
    const { projectId } = req.params;
    const options = await serverOptions.getOptions({
      path,
      projectId,
      ref,
    });
    const authorization = req.get("Authorization");

    if (
      !options ||
      !authorization ||
      !(await options.authCheck(authorization))
    ) {
      throw Boom.unauthorized();
    }

    const { body, headers } = await got(
      `/projects/${encodeURIComponent(projectId)}/repository/tree?` +
        querystring.stringify({
          page,
          path,
          ref,
        }),
      {
        baseUrl: getBaseUrl(options),
        headers: {
          "Private-Token": options.gitlab.privateToken,
        },
        json: true,
        timeout: options.gitlab.timeout,
      },
    );

    res.set(
      pick(headers, [
        ...basePickHeaders,
        "x-next-page",
        "x-page",
        "x-per-page",
        "x-prev-page",
        "x-request-id",
        "x-runtime",
        "x-total",
        "x-total-pages",
      ]),
    );
    res.send(body);
  });

const readFile = (serverOptions: IServerOptions) =>
  asyncHandler(async (req, res, next) => {
    const file = req.params["0"];
    const { ref } = req.query;
    const { projectId } = req.params;
    const options = await serverOptions.getOptions({
      path: file,
      projectId,
      ref,
    });
    const authorization = req.get("Authorization");

    if (
      !options ||
      !authorization ||
      !(await options.authCheck(authorization))
    ) {
      throw Boom.unauthorized();
    }

    const { body, headers } = await got(
      `/projects/${encodeURIComponent(
        projectId,
      )}/repository/files/${encodeURIComponent(file)}?` +
        querystring.stringify({
          ref,
        }),
      {
        baseUrl: getBaseUrl(options),
        headers: {
          "Private-Token": options.gitlab.privateToken,
        },
        json: true,
        timeout: options.gitlab.timeout,
      },
    );

    res.set(
      pick(headers, [
        ...basePickHeaders,
        "x-gitlab-blob-id",
        "x-gitlab-commit-id",
        "x-gitlab-content-sha256",
        "x-gitlab-encoding",
        "x-gitlab-file-name",
        "x-gitlab-file-path",
        "x-gitlab-last-commit-id",
        "x-gitlab-ref",
        "x-gitlab-size",
      ]),
    );
    res.send(body);
  });

const commit = (serverOptions: IServerOptions) =>
  asyncHandler(async (req, res, next) => {
    const commitBody: ICommitBody = req.body;
    const { projectId } = req.params;

    if (
      !commitBody ||
      !commitBody.branch ||
      !commitBody.actions ||
      !commitBody.actions[0]
    ) {
      throw Boom.badRequest();
    }

    const options = await serverOptions.getOptions({
      path: commitBody.actions[0].file_path,
      projectId,
      ref: commitBody.branch,
    });
    const authorization = req.get("Authorization");

    if (
      !options ||
      !authorization ||
      !(await options.authCheck(authorization))
    ) {
      throw Boom.unauthorized();
    }

    const { body, headers } = await got(
      `/projects/${encodeURIComponent(projectId)}/repository/commits`,
      {
        baseUrl: getBaseUrl(options),
        body: commitBody,
        headers: {
          "Private-Token": options.gitlab.privateToken,
        },
        json: true,
        method: "POST",
        timeout: options.gitlab.timeout,
      },
    );

    res.set(pick(headers, [...basePickHeaders]));
    res.send(body);
  });

// Utils

const getBaseUrl = ({ gitlab }: IOptions) => {
  const { host, version } = gitlab || defaultGitlabOptions;
  return [
    host || defaultGitlabOptions.host,
    "api",
    version || defaultGitlabOptions.version,
  ].join("/");
};
