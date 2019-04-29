import got from "got";
import pick from "lodash/pick";
import querystring from "querystring";
import { Omit } from "type-fest";
import {
  Backend,
  IBackendCommitOptions,
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
}

export class BackendGitlab implements Backend {
  private readonly options: IBackendGitlabOptions;

  constructor (options: IBackendGitlabOptions) {
    this.options = options
  }

  public async tree({
    projectId,
    page,
    path,
    ref,
  }: IBackendTreeOptions) {
    const { body, headers } = await got(
      `/projects/${encodeURIComponent(projectId)}/repository/tree?` +
        querystring.stringify({
          page,
          path,
          ref,
        }),
      {
        baseUrl: getBaseUrl(this.options),
        headers: {
          "Private-Token": this.options.privateToken,
        },
        json: true,
        timeout: this.options.timeout,
      },
    );

    return {
      body,
      headers: pick(headers, [
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
    };
  }
  public async readFile({
    projectId,
    ref,
    file,
  }: IBackendReadFileOptions) {
    const { body, headers } = await got(
      `/projects/${encodeURIComponent(
        projectId,
      )}/repository/files/${encodeURIComponent(file)}?` +
        querystring.stringify({
          ref,
        }),
      {
        baseUrl: getBaseUrl(this.options),
        headers: {
          "Private-Token": this.options.privateToken,
        },
        json: true,
        timeout: this.options.timeout,
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
  }
  public async commit({
    projectId,
    commitBody,
  }: IBackendCommitOptions) {
    const { body, headers } = await got(
      `/projects/${encodeURIComponent(projectId)}/repository/commits`,
      {
        baseUrl: getBaseUrl(this.options),
        body: commitBody,
        headers: {
          "Private-Token": this.options.privateToken,
        },
        json: true,
        method: "POST",
        timeout: this.options.timeout,
      },
    );

    return {
      body,
      headers: pick(headers, [...basePickHeaders]),
    };
  }
}

// Utils

const getBaseUrl = (options: IBackendGitlabOptions) => {
  const { host, version } = options || defaultGitlabOptions;
  return [
    host || defaultGitlabOptions.host,
    "api",
    version || defaultGitlabOptions.version,
  ].join("/");
};
