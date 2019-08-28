import got from "got";
import pick from "lodash/pick";
import querystring from "querystring";
import {
  IBackend,
  IBackendBaseOptions,
  IBackendCommitOptions,
  IBackendListPipelinesOptions,
  IBackendReadFileOptions,
  IBackendTreeOptions,
} from "./interface";

const basePickHeaders = [
  "ratelimit-limit",
  "ratelimit-observed",
  "ratelimit-remaining",
  "ratelimit-reset",
  "ratelimit-resettime",
  "x-request-id",
  "x-runtime",
  "x-next-page",
  "x-page",
  "x-per-page",
  "x-prev-page",
  "x-total",
  "x-total-pages",
];

const paginationPickHeaders = [

]

const defaultGitlabOptions: Omit<IBackendGitlabOptions, "privateToken"> = {
  host: "https://gitlab.com",
  timeout: 30000,
  version: "v4",
};

export interface IBackendGitlabOptions {
  host?: string;
  timeout?: number;
  version?: string;
  privateToken: string;
}

export const backendGitlab = (options: IBackendGitlabOptions): IBackend => ({
  async tree({ projectId, page, path, ref }: IBackendTreeOptions) {
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
          "Private-Token": options.privateToken,
        },
        json: true,
        timeout: options.timeout,
      },
    );

    return {
      body,
      headers: pick(headers, basePickHeaders),
    };
  },
  async readFile({ projectId, ref, file }: IBackendReadFileOptions) {
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
          "Private-Token": options.privateToken,
        },
        json: true,
        timeout: options.timeout,
      },
    );

    return {
      body,
      headers: pick(headers, [
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
    };
  },
  async commit({ projectId, commitBody }: IBackendCommitOptions) {
    const { body, headers } = await got(
      `/projects/${encodeURIComponent(projectId)}/repository/commits`,
      {
        baseUrl: getBaseUrl(options),
        body: commitBody,
        headers: {
          "Private-Token": options.privateToken,
        },
        json: true,
        method: "POST",
        timeout: options.timeout,
      },
    );

    return {
      body,
      headers: pick(headers, basePickHeaders),
    };
  },

  async listPipelines({ projectId, ref }: IBackendListPipelinesOptions) {
    const { body, headers } = await got(
      `/projects/${encodeURIComponent(projectId)}/pipelines?` +
        querystring.stringify({
          ref,
        }),
      {
        baseUrl: getBaseUrl(options),
        headers: {
          "Private-Token": options.privateToken,
        },
        json: true,
        timeout: options.timeout,
      },
    );

    return {
      body,
      headers: pick(headers, basePickHeaders),
    };
  },

  async triggerPipeline({ projectId, ref }: IBackendListPipelinesOptions) {
    const { body, headers } = await got(
      `/projects/${encodeURIComponent(projectId)}/pipeline?` +
        querystring.stringify({
          ref,
        }),
      {
        baseUrl: getBaseUrl(options),
        headers: {
          "Private-Token": options.privateToken,
        },
        json: true,
        method: "POST",
        timeout: options.timeout,
      },
    );

    return {
      body,
      headers: pick(headers, basePickHeaders),
    };
  },

  async getPipeline({
    projectId,
    id,
  }: IBackendBaseOptions & {
    id: string;
  }) {
    const { body, headers } = await got(
      `/projects/${encodeURIComponent(projectId)}/pipelines/${id}`,
      {
        baseUrl: getBaseUrl(options),
        headers: {
          "Private-Token": options.privateToken,
        },
        json: true,
        timeout: options.timeout,
      },
    );

    return {
      body,
      headers: pick(headers, basePickHeaders),
    };
  },
});

// Utils

const getBaseUrl = (options: IBackendGitlabOptions) => {
  const { host, version } = options || defaultGitlabOptions;
  return [
    host || defaultGitlabOptions.host,
    "api",
    version || defaultGitlabOptions.version,
  ].join("/");
};
