import pick from "lodash/pick";
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
import type {
  GithubTreeFile,
  GithubFile,
  GithubCommitBody,
  GithubBranch,
} from "./github.type";

const basePickHeaders = [
  "x-ratelimit-limit",
  "x-ratelimit-remaining",
  "x-ratelimit-reset",
  "x-github-request-id",
];

export interface IBackendGithubOptions {
  host?: string;
  timeout?: number;
  privateToken: string;
  basePath?: string;
}

// DOC : https://docs.github.com/fr/rest/repos/contents?apiVersion=2022-11-28

export const backendGithub = (options: IBackendGithubOptions): IBackend => {
  const authHeaders: RequestInit["headers"] = {
    "X-GitHub-Api-Version": "2022-11-28",
    Accept: "application/vnd.github+json",
    Authorization: `token ${options.privateToken}`,
  };
  const baseUrl = "https://api.github.com";

  const getRepoParts = (projectId: string) => {
    // projectId expected as "owner/repo"
    const [owner, repo] = projectId.split("/");
    return { owner, repo };
  };

  return {
    async tree({ projectId, path, ref }: IBackendTreeOptions) {
      const { owner, repo } = getRepoParts(projectId);
      const url = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
        repo,
      )}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(ref)}`;
      const { body, headers } = await fetchAdvanced<GithubTreeFile[]>(url, {
        headers: authHeaders,
        autoParseJson: true,
        baseUrl,
        timeout: options.timeout,
      });
      const tree: IBackendTreeFile[] = body.map((entry) => ({
        id: entry.sha,
        path: entry.path,
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
      )}/contents/${encodeURIComponent(file)}?ref=${encodeURIComponent(ref)}`;
      const { body, headers } = await fetchAdvanced<GithubFile>(url, {
        headers: authHeaders,
        autoParseJson: true,
        baseUrl,
        timeout: options.timeout,
      });
      return {
        body: {
          blob_id: body.sha,
          content: body.content,
          encoding: body.encoding,
          file_path: body.path,
        },
        headers: pick(headers, basePickHeaders),
      };
    },

    async readFileRaw({ projectId, ref, file }: IBackendReadFileOptions) {
      const { owner, repo } = getRepoParts(projectId);
      const url = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
        repo,
      )}/contents/${encodeURIComponent(file)}?ref=${encodeURIComponent(ref)}`;
      const { body } = await fetchAdvanced<GithubFile>(url, {
        headers: authHeaders,
        autoParseJson: true,
        baseUrl,
        timeout: options.timeout,
      });
      try {
        const { response } = await fetchAdvanced(body.download_url, {
          headers: {
            ...authHeaders,
            Accept: "application/vnd.github.v3.raw",
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
      const { owner, repo } = getRepoParts(projectId);
      const url = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
        repo,
      )}/contents/${encodeURIComponent(file)}?ref=${encodeURIComponent(ref)}`;
      const { headers } = await fetchAdvanced<GithubFile>(url, {
        headers: authHeaders,
        method: "head",
        baseUrl,
        timeout: options.timeout,
      });
      return {
        headers: pick(headers, basePickHeaders),
      };
    },

    async commit({ projectId, commitBody }: IBackendCommitOptions) {
      const { owner, repo } = getRepoParts(projectId);
      const responses: any[] = [];
      for (const action of commitBody.actions) {
        const targetPath = action.file_path;
        const url = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
          repo,
        )}/contents/${encodeURIComponent(targetPath)}`;

        if (action.action === "create" || action.action === "update") {
          let currentSha: string | undefined;
          if (action.action === "update") {
            try {
              const { body: getBody } = await fetchAdvanced<GithubFile>(
                url + `?ref=${encodeURIComponent(commitBody.branch)}`,
                {
                  headers: authHeaders,
                  autoParseJson: true,
                  baseUrl,
                  timeout: options.timeout,
                },
              );
              currentSha = getBody.sha;
            } catch (_) {
              currentSha = undefined;
            }
          }

          const { body } = await fetchAdvanced<GithubFile, GithubCommitBody>(
            url,
            {
              headers: authHeaders,
              autoParseJson: true,
              baseUrl,
              timeout: options.timeout,
              method: "PUT",
              body: {
                message: commitBody.commit_message,
                committer: commitBody.author_email
                  ? {
                      name: commitBody.author_name || "",
                      email: commitBody.author_email,
                    }
                  : undefined,
                sha: currentSha,
                branch: commitBody.branch,
                // content to be base64 encoded
                content: Buffer.from(action.content || "").toString("base64"),
              },
            },
          );
          responses.push(body);
        } else if (action.action === "delete") {
          // Need current sha to delete
          const { body: getBody } = await fetchAdvanced<GithubFile>(
            url + `?ref=${encodeURIComponent(commitBody.branch)}`,
            {
              headers: authHeaders,
              autoParseJson: true,
              baseUrl,
              timeout: options.timeout,
            },
          );
          const { body } = await fetchAdvanced<
            any,
            Omit<GithubCommitBody, "content">
          >(
            `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
              repo,
            )}/contents/${encodeURIComponent(targetPath)}`,
            {
              baseUrl,
              headers: authHeaders,
              method: "DELETE",
              body: {
                message: commitBody.commit_message,
                branch: commitBody.branch,
                sha: getBody.sha,
              },
              timeout: options.timeout,
            },
          );
          responses.push(body);
        } else if (action.action === "move") {
          // Simulate move by copy then delete
          throw new Error("Not implemented");
        }
      }
      return {
        body: responses,
        headers: {},
      };
    },

    async listPipelines({ projectId, ref }: IBackendListPipelinesOptions) {
      throw new Error("Not implemented");
    },

    async triggerPipeline({ projectId, ref }: IBackendListPipelinesOptions) {
      throw new Error("Not implemented");
    },

    async getPipeline({ projectId, id }: IBackendBaseOptions & { id: string }) {
      throw new Error("Not implemented");
    },

    async showBranch({ projectId, ref }) {
      const { owner, repo } = getRepoParts(projectId);
      const url = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
        repo,
      )}/branches/${encodeURIComponent(ref)}`;
      const { body, headers } = await fetchAdvanced<GithubBranch>(url, {
        baseUrl,
        headers: authHeaders,
        autoParseJson: true,
        timeout: options.timeout,
      });
      return {
        body,
        headers: pick(headers, basePickHeaders),
      };
    },
  };
};
