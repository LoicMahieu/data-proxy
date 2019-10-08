import {
  createDataProvider,
  GitlabProviderFileList,
  GitlabProviderFile,
  GitlabProviderPipeline,
} from "@react-admin-git-provider/gitlab";
import { LocalforageCacheProvider } from "@react-admin-git-provider/common";

const baseProviderOptions = {
  projectId: process.env.GITLAB_PROJECT_ID,
  ref: process.env.GITLAB_REF,
  gitlabOptions: {
    host: process.env.REACT_ADMIN_DATA_API,
  },
};

export const getProviderForResource = resource =>
  resource === "pipelines"
    ? new GitlabProviderPipeline({
        ...baseProviderOptions,
      })
    : resource === "articles"
    ? new GitlabProviderFile({
        ...baseProviderOptions,
        path: `${process.env.GITLAB_DATA_BASE_PATH}/${resource}.json`,
        cacheBehavior: "contentSha",
        cacheProvider: new LocalforageCacheProvider({ storeName: "react-admin-gitlab" }),
      })
    : new GitlabProviderFileList({
        ...baseProviderOptions,
        path: `${process.env.GITLAB_DATA_BASE_PATH}/${resource}`,
        cacheProvider: new LocalforageCacheProvider({ storeName: "react-admin-gitlab" }),
      });

export const dataProvider = createDataProvider(({ resource }) =>
  getProviderForResource(resource),
);
