import got from "got";
import pick from "lodash/pick";
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
  "x-ratelimit-limit",
  "x-ratelimit-remaining",
  "x-ratelimit-reset",
  "x-github-request-id",
];

const defaultGithubOptions: Omit<IBackendGithubOptions, "privateToken"> = {
  host: "https://api.github.com",
  timeout: 30000,
};

export interface IBackendGithubOptions {
  host?: string;
  timeout?: number;
  privateToken: string;
  basePath?: string;
}

export const backendGithub = (options: IBackendGithubOptions): IBackend => {
  const appendBasePath = (path: string) =>
    options.basePath ? pathJoin(options.basePath, path) : path;
  const removeBasePath = (path: string) =>
    path.replace(options.basePath || "", "").replace(/^\//, "");

  const authHeaders = {
    Accept: "application/vnd.github.v3+json",
    Authorization: `token ${options.privateToken}`,
    "User-Agent": "data-proxy-server",
  } as const;

  const getRepoParts = (projectId: string) => {
    // projectId expected as "owner/repo"
    const [owner, repo] = projectId.split("/");
    return { owner, repo };
  };

  return {
    async tree({ projectId, page, path, ref }: IBackendTreeOptions) {
      // Map to GitHub contents API for directory listing
      const { owner, repo } = getRepoParts(projectId);
      const url = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
        repo,
      )}/contents/${encodeURIComponent(appendBasePath(path))}?ref=${encodeURIComponent(
        ref,
      )}`;
      const { body, headers } = await got(url, {
        baseUrl: getBaseUrl(options),
        headers: authHeaders,
        json: true,
        timeout: options.timeout || defaultGithubOptions.timeout,
      });
      const entries: Array<any> = Array.isArray(body) ? body : [];
      const tree: IBackendTreeFile[] = entries.map((entry) => ({
        id: entry.sha,
        path: removeBasePath(entry.path),
        name: entry.name,
      }));
      return {
        body: tree,
        headers: pick(headers, basePickHeaders),
      };
    },

    async readFile({ projectId, ref, file }: IBackendReadFileOptions) {
      const { owner, repo } = getRepoParts(projectId);
      const url = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
        repo,
      )}/contents/${encodeURIComponent(appendBasePath(file))}?ref=${encodeURIComponent(
        ref,
      )}`;
      const { body, headers } = await got(url, {
        baseUrl: getBaseUrl(options),
        headers: authHeaders,
        json: true,
        timeout: options.timeout || defaultGithubOptions.timeout,
      });
      const result = body as any;
      return {
        body: {
          blob_id: result.sha,
          content: result.content,
          encoding: result.encoding,
          file_path: removeBasePath(result.path),
        },
        headers: pick(headers, basePickHeaders),
      };
    },

    async readFileRaw({ projectId, ref, file }: IBackendReadFileOptions) {
      const { owner, repo } = getRepoParts(projectId);
      const url = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
        repo,
      )}/contents/${encodeURIComponent(appendBasePath(file))}?ref=${encodeURIComponent(
        ref,
      )}`;
      return got.stream(url, {
        baseUrl: getBaseUrl(options),
        headers: { ...authHeaders, Accept: "application/vnd.github.v3.raw" },
        timeout: options.timeout || defaultGithubOptions.timeout,
      });
    },

    async headFile({ projectId, ref, file }: IBackendReadFileOptions) {
      const { owner, repo } = getRepoParts(projectId);
      const url = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
        repo,
      )}/contents/${encodeURIComponent(appendBasePath(file))}?ref=${encodeURIComponent(
        ref,
      )}`;
      const { headers } = await got(url, {
        baseUrl: getBaseUrl(options),
        headers: authHeaders,
        method: "head",
        timeout: options.timeout || defaultGithubOptions.timeout,
      });
      return {
        headers: pick(headers, basePickHeaders),
      };
    },

    async commit({ projectId, commitBody }: IBackendCommitOptions) {
      // Implement via contents API per action (multiple commits)
      const { owner, repo } = getRepoParts(projectId);
      const responses: any[] = [];
      for (const action of commitBody.actions) {
        const targetPath = appendBasePath(action.file_path);
        if (action.action === "create" || action.action === "update") {
          let currentSha: string | undefined;
          if (action.action === "update") {
            try {
              const { body: getBody } = await got(
                `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
                  repo,
                )}/contents/${encodeURIComponent(targetPath)}?ref=${encodeURIComponent(
                  commitBody.branch,
                )}`,
                {
                  baseUrl: getBaseUrl(options),
                  headers: authHeaders,
                  json: true,
                  timeout: options.timeout || defaultGithubOptions.timeout,
                },
              );
              currentSha = (getBody as any).sha;
            } catch (_) {
              currentSha = undefined;
            }
          }
          const { body } = await got(
            `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
              repo,
            )}/contents/${encodeURIComponent(targetPath)}`,
            {
              baseUrl: getBaseUrl(options),
              headers: authHeaders,
              json: true,
              method: "PUT",
              body: {
                message: commitBody.commit_message,
                content: action.content || "",
                branch: commitBody.branch,
                sha: currentSha,
              },
              timeout: options.timeout || defaultGithubOptions.timeout,
            },
          );
          responses.push(body);
        } else if (action.action === "delete") {
          // Need current sha to delete
          const { body: getBody } = await got(
            `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
              repo,
            )}/contents/${encodeURIComponent(targetPath)}?ref=${encodeURIComponent(
              commitBody.branch,
            )}`,
            {
              baseUrl: getBaseUrl(options),
              headers: authHeaders,
              json: true,
              timeout: options.timeout || defaultGithubOptions.timeout,
            },
          );
          const currentSha = (getBody as any).sha;
          const { body } = await got(
            `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
              repo,
            )}/contents/${encodeURIComponent(targetPath)}`,
            {
              baseUrl: getBaseUrl(options),
              headers: authHeaders,
              json: true,
              method: "DELETE",
              body: {
                message: commitBody.commit_message,
                branch: commitBody.branch,
                sha: currentSha,
              },
              timeout: options.timeout || defaultGithubOptions.timeout,
            },
          );
          responses.push(body);
        } else if (action.action === "move") {
          // Simulate move by copy then delete
          const { body: getBody } = await got(
            `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
              repo,
            )}/contents/${encodeURIComponent(targetPath)}?ref=${encodeURIComponent(
              commitBody.branch,
            )}`,
            {
              baseUrl: getBaseUrl(options),
              headers: authHeaders,
              json: true,
              timeout: options.timeout || defaultGithubOptions.timeout,
            },
          );
          const current = getBody as any;
          const content = current.content; // base64
          const fromPath = targetPath;
          const toPath = appendBasePath((action as any).content || fromPath);
          const createRes = await got(
            `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
              repo,
            )}/contents/${encodeURIComponent(toPath)}`,
            {
              baseUrl: getBaseUrl(options),
              headers: authHeaders,
              json: true,
              method: "PUT",
              body: {
                message: commitBody.commit_message,
                content,
                branch: commitBody.branch,
              },
              timeout: options.timeout || defaultGithubOptions.timeout,
            },
          );
          const deleteRes = await got(
            `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
              repo,
            )}/contents/${encodeURIComponent(fromPath)}`,
            {
              baseUrl: getBaseUrl(options),
              headers: authHeaders,
              json: true,
              method: "DELETE",
              body: {
                message: commitBody.commit_message,
                branch: commitBody.branch,
                sha: current.sha,
              },
              timeout: options.timeout || defaultGithubOptions.timeout,
            },
          );
          responses.push(createRes.body, deleteRes.body);
        }
      }
      return {
        body: responses,
        headers: {},
      };
    },

    async listPipelines({ projectId, ref }: IBackendListPipelinesOptions) {
      const { owner, repo } = getRepoParts(projectId);
      const url = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
        repo,
      )}/actions/runs?branch=${encodeURIComponent(ref)}`;
      const { body, headers } = await got(url, {
        baseUrl: getBaseUrl(options),
        headers: authHeaders,
        json: true,
        timeout: options.timeout || defaultGithubOptions.timeout,
      });
      return {
        body,
        headers: pick(headers, basePickHeaders),
      };
    },

    async triggerPipeline({ projectId, ref }: IBackendListPipelinesOptions) {
      // Not enough information to dispatch a specific workflow; return 501-like response
      return {
        body: { error: "Not implemented for GitHub without a workflow id" },
        headers: {},
      };
    },

    async getPipeline({ projectId, id }: IBackendBaseOptions & { id: string }) {
      const { owner, repo } = getRepoParts(projectId);
      const url = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
        repo,
      )}/actions/runs/${encodeURIComponent(id)}`;
      const { body, headers } = await got(url, {
        baseUrl: getBaseUrl(options),
        headers: authHeaders,
        json: true,
        timeout: options.timeout || defaultGithubOptions.timeout,
      });
      return {
        body,
        headers: pick(headers, basePickHeaders),
      };
    },

    async showBranch({ projectId, ref }) {
      const { owner, repo } = getRepoParts(projectId);
      const url = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
        repo,
      )}/branches/${encodeURIComponent(ref)}`;
      const { body, headers } = await got(url, {
        baseUrl: getBaseUrl(options),
        headers: authHeaders,
        json: true,
        timeout: options.timeout || defaultGithubOptions.timeout,
      });
      return {
        body,
        headers: pick(headers, basePickHeaders),
      };
    },
  };
};

// Utils
const getBaseUrl = (options: IBackendGithubOptions) => {
  const { host } = options || defaultGithubOptions;
  return host || defaultGithubOptions.host;
};