import got from "got";
import pick from "lodash/pick";
import querystring from "querystring";
import { join as pathJoin } from "path";
import { Octokit } from "octokit";
import {
  IBackend,
  IBackendBaseOptions,
  IBackendCommitOptions,
  IBackendListPipelinesOptions,
  IBackendReadFileOptions,
  IBackendTreeFile,
  IBackendTreeOptions,
} from "./interface";
import { badRequest, notFound } from "boom";
import { startsWith } from "lodash";

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

const defaultGitlabOptions: Omit<
  IBackendGithubOptions,
  "privateToken" | "token"
> = {
  host: "https://gitlab.com",
  timeout: 30000,
  version: "v4",
};

export interface IBackendGithubOptions {
  host?: string;
  timeout?: number;
  version?: string;
  privateToken: string;
  basePath?: string;

  token: string;
}

export const backendGithub = (options: IBackendGithubOptions): IBackend => {
  const appendBasePath = (path: string) =>
    options.basePath ? pathJoin(options.basePath, path) : path;
  const removeBasePath = (path: string) =>
    path.replace(options.basePath || "", "").replace(/^\//, "");

  const octokit = new Octokit({
    auth: options.token,
  });

  const getContent = async ({
    projectId,
    ref,
    file,
  }: {
    projectId: string;
    ref: string;
    file: string;
  }) => {
    const tree = await octokit.rest.git.getTree({
      owner: projectId.split("/")[0],
      repo: projectId.split("/")[1],
      tree_sha: ref,
      recursive: "true",
    });
    const treeFile = tree.data.tree.find(f => f.path === file);
    if (!(treeFile && treeFile.sha)) {
      throw notFound("file not found sin tree", {
        projectId,
        file,
        ref,
      });
    }
    const result = await octokit.rest.repos.getContent({
      owner: projectId.split("/")[0],
      repo: projectId.split("/")[1],
      path: file,
    });
    const content = result.data;
    if (!(typeof content === "object" && "content" in content)) {
      throw notFound("file not found or invalid", {
        projectId,
        file,
        ref,
      });
    }
    return content;
  };

  return {
    async tree({
      projectId,
      page,
      path: treePath,
      ref,
    }: IBackendTreeOptions): ReturnType<IBackend["tree"]> {
      const result = await octokit.rest.git.getTree({
        owner: projectId.split("/")[0],
        repo: projectId.split("/")[1],
        tree_sha: ref,
        recursive: "true",
      });
      const {
        data: { tree: baseTree },
      } = result;
      const tree: IBackendTreeFile[] = baseTree
        .map(
          ({ path, sha, type }) =>
            type === "blob" &&
            startsWith(path, treePath) &&
            path &&
            sha && {
              id: sha,
              path: removeBasePath(path),
            },
        )
        .filter((item): item is IBackendTreeFile => !!item);

      return {
        body: tree,
        headers: pick(
          {
            // todo pagination headers
          },
          basePickHeaders,
        ),
      };
    },
    async readFile({ projectId, ref, file }: IBackendReadFileOptions) {
      const content = await getContent({ projectId, ref, file });
      return {
        body: {
          blob_id: content.sha,
          content: content.content.split("\n").join(""),
          encoding: content.encoding as BufferEncoding,
          file_path: content.url,
        },
        headers: {
          "X-Gitlab-Blob-Id": content.sha,
          "X-Gitlab-Commit-Id": "",
          "X-Gitlab-Content-Sha256": content.sha,
          "X-Gitlab-Size": content.size,
        },
      };
    },
    async readFileRaw({ projectId, ref, file }: IBackendReadFileOptions) {
      const content = await getContent({ projectId, ref, file });
      if (!content.download_url) {
        throw badRequest("file does not have download link", {
          projectId,
          file,
          ref,
        });
      }
      return got.stream(content.download_url);
    },
    async headFile({ projectId, ref, file }: IBackendReadFileOptions) {
      const content = await getContent({ projectId, ref, file });
      if (!content.download_url) {
        throw badRequest("file does not have download link", {
          projectId,
          file,
          ref,
        });
      }
      return {
        headers: {
          "X-Gitlab-Blob-Id": content.sha,
          "X-Gitlab-Commit-Id": "",
          "X-Gitlab-Content-Sha256": content.sha,
          "X-Gitlab-Size": content.size,
        },
      };
    },
    async commit({ projectId, commitBody }: IBackendCommitOptions) {
      octokit.rest.git.createCommit({});
      const { body, headers } = await got(
        `/projects/${encodeURIComponent(projectId)}/repository/commits`,
        {
          baseUrl: getBaseUrl(options),
          body: {
            ...commitBody,
            actions: commitBody.actions.map(action => ({
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

    async showBranch({ projectId, ref }) {
      const { body, headers } = await got(
        `/projects/${encodeURIComponent(
          projectId,
        )}/repository/branches/${encodeURIComponent(ref)}?` +
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
  };
};

// Utils

const getBaseUrl = (options: IBackendGithubOptions) => {
  const { host, version } = options || defaultGitlabOptions;
  return [
    host || defaultGitlabOptions.host,
    "api",
    version || defaultGitlabOptions.version,
  ].join("/");
};
