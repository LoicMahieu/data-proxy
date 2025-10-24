import { OptionsJson } from "body-parser";
import { IncomingMessage } from "http";
import { IAuthBackend, IAuthTokenData } from "./auth/base";
import { IBackend } from "./backend/interface";

export interface IBeforeData {
  path?: string;
  ref?: string;
}

export interface IServerOptions {
  projectId: string;
  auth: IAuthBackend | ((req: IncomingMessage) => IAuthBackend);
  backend: IBackend | ((req: IncomingMessage) => IBackend);
  before?: (data: IBeforeData) => Promise<void>;
  beforeCommit?: (
    data: ICommitBody,
    authData: IAuthTokenData,
  ) => Promise<void | ICommitBody>;
  prefix?: string;
  bodyParserOptions?: OptionsJson;
  getPermissions?: (
    authData: IAuthTokenData,
  ) => string | string[] | Promise<string | string[]>;
}

export type IServerOptionsForRequest = (
  req: IncomingMessage,
) => Promise<
  IServerOptions & {
    auth: IAuthBackend;
    backend: IBackend;
  }
>;

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
  committer_email?: string;
  committer_name?: string;
}
