import { ProviderFileListOptions } from "@react-admin-git-provider/common";
import { GitlabProviderFileList as BaseGitlabProviderFileList } from "@react-admin-git-provider/gitlab";
import { GitlabOptions } from "@react-admin-git-provider/gitlab/lib/GitlabProviderAPI";
import { Omit } from "type-fest";
import { getToken } from "./authProvider";

export class GitlabProviderFileList extends BaseGitlabProviderFileList {
  constructor(
    options: ProviderFileListOptions & {
      gitlabOptions: GitlabOptions // Omit<GitlabOptions, "oauthToken">;
    },
  ) {
    super({
      ...options,
      gitlabOptions: {
        ...options.gitlabOptions,
        oauthToken: getToken(),
      },
    });
  }
}
