import { OutgoingHttpHeaders } from "http";
import { ICommitBody } from "../types";

export interface IBackendBaseOptions {
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
export interface IBackendTreeFile {
  id: string;
  path: string;
}
export interface IBackendFile {
  blob_id: string;
  content: string;
  encoding: "base64";
  file_path: string;
}

export interface IBackendListPipelinesOptions extends IBackendBaseOptions {
  ref: string;
}

export interface IBackend {
  tree(
    options: IBackendTreeOptions,
  ): Promise<{ headers: OutgoingHttpHeaders; body: IBackendTreeFile[] }>;
  readFile(
    options: IBackendReadFileOptions,
  ): Promise<{ headers: OutgoingHttpHeaders; body: IBackendFile }>;
  commit(
    options: IBackendCommitOptions,
  ): Promise<{ headers: OutgoingHttpHeaders; body: any }>;

  listPipelines(
    options: IBackendListPipelinesOptions,
  ): Promise<{ headers: OutgoingHttpHeaders; body: any }>;
  triggerPipeline(
    options: IBackendListPipelinesOptions,
  ): Promise<{ headers: OutgoingHttpHeaders; body: any }>;
  getPipeline(
    options: IBackendBaseOptions & {
      id: string;
    },
  ): Promise<{ headers: OutgoingHttpHeaders; body: any }>;

  showBranch(
    options: IBackendBaseOptions & {
      ref: string;
    },
  ): Promise<{ headers: OutgoingHttpHeaders; body: any }>;
}
