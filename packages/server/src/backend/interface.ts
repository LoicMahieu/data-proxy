import { OutgoingHttpHeaders } from "http";
import { ICommitBody } from "../types";

interface IBackendBaseOptions {
  projectId: string;
}

export interface IBackendTreeOptions extends IBackendBaseOptions {
  ref: string;
  path: string;
  page: string;
}

export interface IBackendReadFileOptions extends IBackendBaseOptions {
  ref: string;
  file: string;
}

export interface IBackendCommitOptions extends IBackendBaseOptions {
  commitBody: ICommitBody;
}

export interface IBackend {
  tree(
    options: IBackendTreeOptions,
  ): Promise<{ headers: OutgoingHttpHeaders; body: any }>;
  readFile(
    options: IBackendReadFileOptions,
  ): Promise<{ headers: OutgoingHttpHeaders; body: any }>;
  commit(
    options: IBackendCommitOptions,
  ): Promise<{ headers: OutgoingHttpHeaders; body: any }>;
}
