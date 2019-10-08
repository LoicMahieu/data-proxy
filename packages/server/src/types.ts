import { OptionsJson } from "body-parser";
import { IAuthBackend, IAuthTokenData } from "./auth/base";
import { IBackend } from "./backend/interface";

export interface IBeforeData {
  path?: string;
  ref?: string;
}

export interface IServerOptions {
  projectId: string;
  auth: IAuthBackend;
  backend: IBackend;
  before?: (data: IBeforeData) => Promise<void>;
  beforeCommit?: (data: ICommitBody, authData: IAuthTokenData) => Promise<void | ICommitBody>;
  prefix?: string;
  bodyParserOptions?: OptionsJson
}

export interface ICommitAction {
  action: "create" | "delete" | "move" | "update";
  file_path: string;
  content?: string;
  encoding?: string;
}

export interface ICommitBody {
  actions: ICommitAction[];
  branch: string;
  commit_message: string;
  author_email?: string;
  author_name?: string;
}
