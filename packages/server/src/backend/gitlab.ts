import got from "got";
import pick from "lodash/pick";
import { stringify } from "querystring";
import { join as pathJoin } from "path";
import {
  IBackend,
  IBackendBaseOptions,
  IBackendCommitOptions,
  IBackendListPipelinesOptions,
  IBackendReadFileOptions,
  IBackendTreeFile,
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
  basePath?: string;
}

export const backendGitlab = (options: IBackendGitlabOptions): IBackend => {
  const appendBasePath = (path: string) =>
    options.basePath ? pathJoin(options.basePath, path) : path;
  const removeBasePath = (path: string) =>
    path.replace(options.basePath || "", "").replace(/^\//, "");
  return {
    async tree({ projectId, page, path, ref }: IBackendTreeOptions) {
      const { body, headers } = await got(
        `/projects/${encodeURIComponent(projectId)}/repository/tree?` +
          stringify({
            page,
            path: appendBasePath(path),
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
      const tree: IBackendTreeFile[] = body;
      const treeWithoutBasePath = tree.map((file) => ({
        ...file,
        path: removeBasePath(file.path),
      }));

      return {
        body: treeWithoutBasePath,
        headers: pick(headers, basePickHeaders),
      };
    },
    async readFile({ projectId, ref, file }: IBackendReadFileOptions) {
      const { body, headers } = await got(
        `/projects/${encodeURIComponent(
          projectId,
        )}/repository/files/${encodeURIComponent(appendBasePath(file))}?` +
          stringify({
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
    async readFileRaw({ projectId, ref, file }: IBackendReadFileOptions) {
      return got.stream(
        `/projects/${encodeURIComponent(
          projectId,
        )}/repository/files/${encodeURIComponent(appendBasePath(file))}/raw?` +
          stringify({
            ref,
          }),
        {
          baseUrl: getBaseUrl(options),
          headers: {
            "Private-Token": options.privateToken,
          },
          timeout: options.timeout,
        },
      );
    },
    async headFile({ projectId, ref, file }: IBackendReadFileOptions) {
      const { headers } = await got(
        `/projects/${encodeURIComponent(
          projectId,
        )}/repository/files/${encodeURIComponent(appendBasePath(file))}?` +
          stringify({
            ref,
          }),
        {
          baseUrl: getBaseUrl(options),
          headers: {
            "Private-Token": options.privateToken,
          },
          json: true,
          method: "head",
          timeout: options.timeout,
        },
      );

      return {
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
          body: {
            ...commitBody,
            actions: commitBody.actions.map((action) => ({
              ...action,
              file_path: appendBasePath(action.file_path),
            })),
          },
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
          stringify({
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
          stringify({
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

    async showBranch({ projectId, ref }) {
      const { body, headers } = await got(
        `/projects/${encodeURIComponent(
          projectId,
        )}/repository/branches/${encodeURIComponent(ref)}?` +
          stringify({
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
  };
};

// Utils

const getBaseUrl = (options: IBackendGitlabOptions) => {
  const { host, version } = options || defaultGitlabOptions;
  return [
    host || defaultGitlabOptions.host,
    "api",
    version || defaultGitlabOptions.version,
  ].join("/");
};
