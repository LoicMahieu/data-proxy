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

export declare class Backend {
  public tree(
    options: IBackendTreeOptions,
  ): Promise<{ headers: OutgoingHttpHeaders; body: any }>;
  public readFile(
    options: IBackendReadFileOptions,
  ): Promise<{ headers: OutgoingHttpHeaders; body: any }>;
  public commit(
    options: IBackendCommitOptions,
  ): Promise<{ headers: OutgoingHttpHeaders; body: any }>;
}
