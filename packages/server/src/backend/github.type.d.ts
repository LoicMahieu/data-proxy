export type GithubTreeFile = {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: string; // ex: file
  _links: {
    self: string;
    git: string;
    html: string;
  };
};
export type GithubFile = GithubTreeFile & {
  content: string;
  encoding: "base64";
};
export type GithubCommitBody = {
  message: string;
  content: string; // base64 encoded
  sha?: string; // required for update
  branch?: string;
  committer?: {
    name: string;
    email: string;
    date?: string;
  };
  author?: {
    name: string;
    email: string;
    date?: string;
  };
};
type GithubUser = {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  user_view_type: string;
  site_admin: boolean;
};
export type GithubBranch = {
  name: string;
  commit: {
    sha: string;
    node_id: string;
    commit: {
      author: {
        name: string;
        email: string;
        date?: string;
      };
      committer: {
        name: string;
        email: string;
        date?: string;
      };
      message: string;
      tree: any;
      url: string;
      comment_count: number;
      verification: any;
    };
    url: string;
    html_url: string;
    comments_url: string;
    author: GithubUser;
    committer: GithubUser;
    parents: any[];
  };
  _links: {
    self: string;
    html: string;
  };
  protected: boolean;
  protection: {
    enabled: boolean;
    required_status_checks: {
      enforcement_level: string;
      contexts: string[];
      checks: string[];
    };
  };
  protection_url: string;
};
