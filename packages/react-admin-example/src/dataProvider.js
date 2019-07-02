import {
  createDataProvider,
  GitlabProviderFileList,
  GitlabProviderPipeline,
} from "@data-proxy/react-admin-provider";

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
    : new GitlabProviderFileList({
        ...baseProviderOptions,
        basePath: `${process.env.GITLAB_DATA_BASE_PATH}/${resource}`,
      });

export const dataProvider = createDataProvider(({ resource }) =>
  getProviderForResource(resource),
);
