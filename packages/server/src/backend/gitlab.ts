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
import { fetchAdvanced, FetchAdvancedResponseError } from "../fetchAdvanced";
import { Readable } from "stream";

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

const defaultGitlabOptions: Required<
  Pick<IBackendGitlabOptions, "host" | "timeout" | "version">
> = {
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
      const { body, headers } = await fetchAdvanced(
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
          autoParseJson: true,
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
      const { body, headers } = await fetchAdvanced(
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
          autoParseJson: true,
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
      const url =
        `/projects/${encodeURIComponent(
          projectId,
        )}/repository/files/${encodeURIComponent(appendBasePath(file))}/raw?` +
        stringify({
          ref,
        });
      try {
        const { response } = await fetchAdvanced(url, {
          baseUrl: getBaseUrl(options),
          headers: {
            "Private-Token": options.privateToken,
          },
          timeout: options.timeout,
        });
        if (!response.body) {
          throw new Error("Failed to fetch file: no body to stream");
        }

        const nodeStream = Readable.fromWeb(response.body as any);
        return nodeStream;
      } catch (error) {
        if (error instanceof FetchAdvancedResponseError) {
          // consume and close body
          await error.response.arrayBuffer();
        }
        throw error;
      }
    },
    async headFile({ projectId, ref, file }: IBackendReadFileOptions) {
      const { headers } = await fetchAdvanced(
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
          autoParseJson: true,
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
      const { body, headers } = await fetchAdvanced(
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
            "Content-Type": "application/json",
          },
          autoParseJson: true,
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
      const { body, headers } = await fetchAdvanced(
        `/projects/${encodeURIComponent(projectId)}/pipelines?` +
          stringify({
            ref,
          }),
        {
          baseUrl: getBaseUrl(options),
          headers: {
            "Private-Token": options.privateToken,
          },
          autoParseJson: true,
          timeout: options.timeout,
        },
      );

      return {
        body,
        headers: pick(headers, basePickHeaders),
      };
    },

    async triggerPipeline({ projectId, ref }: IBackendListPipelinesOptions) {
      const { body, headers } = await fetchAdvanced(
        `/projects/${encodeURIComponent(projectId)}/pipeline?` +
          stringify({
            ref,
          }),
        {
          baseUrl: getBaseUrl(options),
          headers: {
            "Private-Token": options.privateToken,
          },
          autoParseJson: true,
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
      const { body, headers } = await fetchAdvanced(
        `/projects/${encodeURIComponent(projectId)}/pipelines/${id}`,
        {
          baseUrl: getBaseUrl(options),
          headers: {
            "Private-Token": options.privateToken,
          },
          autoParseJson: true,
          timeout: options.timeout,
        },
      );

      return {
        body,
        headers: pick(headers, basePickHeaders),
      };
    },

    async showBranch({ projectId, ref }) {
      const { body, headers } = await fetchAdvanced(
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
          autoParseJson: true,
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
  return pathJoin(
    host || defaultGitlabOptions.host,
    "api",
    version || defaultGitlabOptions.version,
  );
};
