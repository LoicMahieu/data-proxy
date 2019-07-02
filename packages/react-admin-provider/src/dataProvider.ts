import {
  createDataProvider,
  GitlabProviderFileList as BaseGitlabProviderFileList,
  GitlabProviderFileListOptions,
  GitlabProviderPipeline as BaseGitlabProviderPipeline,
} from "@react-admin-git-provider/gitlab";
import { getToken } from "./authProvider";

export { createDataProvider };

export class GitlabProviderFileList extends BaseGitlabProviderFileList {
  constructor(options: GitlabProviderFileListOptions) {
    super({
      ...options,
      gitlabOptions: {
        ...options.gitlabOptions,
        oauthToken: getToken(),
      },
    });
  }
}

export class GitlabProviderPipeline extends BaseGitlabProviderPipeline {
  constructor(options: GitlabProviderFileListOptions) {
    super({
      ...options,
      gitlabOptions: {
        ...options.gitlabOptions,
        oauthToken: getToken(),
      },
    });
  }
}
