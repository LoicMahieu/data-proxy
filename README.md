# data-proxy

## Backend

Example in file `packages/server/scripts/test-server.ts`

### Gitlab

```ts
interface IBackendGitlabOptions {
  host?: string;
  timeout?: number;
  version?: string;
  privateToken: string;
  basePath?: string;
}

backendGitlab({
  privateToken: process.env.GITLAB_PRIVATE_TOKEN || "",
  host: process.env.GITLAB_HOST,
});
```

### Github

Use `privateToken` or `appToken` to authenticate.

```ts
interface IBackendGithubOptions {
  timeout?: number;
  basePath?: string;
  privateToken?: string;
  appToken?: {
    appId: string;
    privateKey: string;
  };
}

const backendTypeGithub = backendGithub({
  // privateToken: process.env.GITHUB_PRIVATE_TOKEN || "",
  appToken: {
    appId: process.env.GITHUB_APP_ID || "",
    privateKey:
      (process.env.GITHUB_PRIVATE_KEY &&
        Buffer.from(process.env.GITHUB_PRIVATE_KEY, "base64").toString(
          "utf-8",
        )) ||
      "",
  },
});
```

⚠️ Permissions required : `contents: write`, `metadata: read`.  
Don't forget to configure the repository access in the Github App settings installed in the organization or repository.


### Filesystem

```ts
backendFilesystem({
  cwd: join(__dirname, "../../react-admin-example"),
});
```
