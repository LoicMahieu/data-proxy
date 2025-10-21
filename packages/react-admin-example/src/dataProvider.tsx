import {
  createDataProvider,
  GitlabProviderFileList,
  GitlabProviderFile,
  GitlabProviderPipeline,
} from "@react-admin-git-provider/gitlab";
import { LocalforageCacheProvider } from "@react-admin-git-provider/common";

const baseProviderOptions = {
  projectId: process.env.GIT_PROJECT_ID || "",
  ref: process.env.GIT_REF || "",
  gitlabOptions: {
    host: process.env.REACT_ADMIN_DATA_API || "",
  },
};

export const getProviderForResource = (resource: string) =>
  resource === "pipelines"
    ? new GitlabProviderPipeline({
        ...baseProviderOptions,
        path: `${process.env.GITLAB_DATA_BASE_PATH}/${resource}.json`,
      })
    : resource === "articles"
    ? new GitlabProviderFile({
        ...baseProviderOptions,
        path: `${process.env.GITLAB_DATA_BASE_PATH}/${resource}.json`,
        cacheBehavior: "contentSha",
        cacheProvider: new LocalforageCacheProvider({
          storeName: "react-admin-gitlab",
        }),
        serializer: "json",
      })
    : new GitlabProviderFileList({
        ...baseProviderOptions,
        path: `${process.env.GITLAB_DATA_BASE_PATH}/${resource}`,
        cacheProvider: new LocalforageCacheProvider({
          storeName: "react-admin-gitlab",
        }),
        serializer: "json",
      });

export const dataProvider = createDataProvider(({ resource }) =>
  getProviderForResource(resource),
);
