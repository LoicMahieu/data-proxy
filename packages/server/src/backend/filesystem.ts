import fs from "fs-extra";
import hasha from "hasha";
import path from "path";
import { ICommitAction } from "../types";
import {
  IBackend,
  IBackendCommitOptions,
  IBackendReadFileOptions,
  IBackendTreeFile,
  IBackendTreeOptions,
} from "./interface";
import { notFound } from "@hapi/boom";
import crypto from "crypto";

const uuid = () => {
  return crypto.randomUUID();
};

const fileNotFoundError = (filePath: string) =>
  notFound("File does not exists", {
    filePath,
  });
const fileIsDirectoryError = (filePath: string) =>
  notFound("File is a directory", {
    filePath,
  });

async function fileToTree(
  filePath: string,
  options: IBackendFilesystemOptions,
) {
  const absFilePath = path.join(options.cwd, filePath);
  if (!(await fs.pathExists(absFilePath))) {
    return;
  }

  const stat = await fs.stat(absFilePath);

  if (stat.isDirectory()) {
    return {
      id: "a67a42c0ff0435776c2873d06ff6ec7cd8940be3",
      mode: "040000",
      name: path.basename(filePath),
      path: filePath,
      type: "tree",
    };
  } else {
    const content = await fs.readFile(absFilePath);
    const hash = hasha(content);
    return {
      id: hash,
      mode: "100644",
      name: path.basename(filePath),
      path: filePath,
      type: "blob",
    };
  }
}

async function doCommitAction(
  action: ICommitAction,
  options: IBackendFilesystemOptions,
) {
  const absFilePath = path.join(options.cwd, action.file_path);
  if (action.action === "create" || action.action === "update") {
    await fs.mkdir(path.dirname(absFilePath), { recursive: true });
    await fs.writeFile(
      absFilePath,
      action.content || "",
      action.encoding === "base64" ? "base64" : "utf8",
    );
  } else if (action.action === "delete") {
    await fs.unlink(absFilePath);
  }
}

export interface IBackendFilesystemOptions {
  cwd: string;
}

export const backendFilesystem = (
  options: IBackendFilesystemOptions,
): IBackend => ({
  async tree({ projectId, page, path: basePath, ref }: IBackendTreeOptions) {
    const absBasePath = path.join(options.cwd, basePath);
    if (
      !(await fs.pathExists(absBasePath)) &&
      !(await fs.stat(absBasePath)).isDirectory
    ) {
      return {
        body: [],
        headers: {},
      };
    }

    const files = await fs.readdir(absBasePath);
    const treeFiles = await Promise.all(
      files.map((fileName) =>
        fileToTree(path.join(basePath, fileName), options),
      ),
    );

    return {
      body: treeFiles as IBackendTreeFile[],
      headers: {},
    };
  },

  async readFile({ projectId, ref, file }: IBackendReadFileOptions) {
    const absFilePath = path.join(options.cwd, file);
    if (!(await fs.pathExists(absFilePath))) {
      throw fileNotFoundError(absFilePath);
    }

    const stat = await fs.stat(absFilePath);

    if (stat.isDirectory()) {
      throw fileIsDirectoryError(absFilePath);
    }

    const content = await fs.readFile(absFilePath);
    const hash = await hasha(content);

    return {
      body: {
        blob_id: hash,
        commit_id: "",
        content: content.toString("base64"),
        content_sha256: hash,
        encoding: "base64",
        file_name: path.basename(file),
        file_path: file,
        last_commit_id: "",
        ref: "master",
        size: content.length,
      },
      headers: {},
    };
  },

  async readFileRaw({ projectId, ref, file }: IBackendReadFileOptions) {
    const absFilePath = path.join(options.cwd, file);
    if (!(await fs.pathExists(absFilePath))) {
      throw fileNotFoundError(absFilePath);
    }

    const stat = await fs.stat(absFilePath);
    if (stat.isDirectory()) {
      throw fileIsDirectoryError(absFilePath);
    }

    return fs.createReadStream(absFilePath);
  },

  async headFile({ projectId, ref, file }: IBackendReadFileOptions) {
    const absFilePath = path.join(options.cwd, file);
    if (!(await fs.pathExists(absFilePath))) {
      throw fileNotFoundError(absFilePath);
    }

    const stat = await fs.stat(absFilePath);
    if (stat.isDirectory()) {
      throw fileIsDirectoryError(absFilePath);
    }

    return {
      headers: {
        "x-gitlab-blob-id": uuid(),
        "x-gitlab-commit-id": uuid(),
        "x-gitlab-content-sha256": uuid(),
        "x-gitlab-size": 0,
      },
    };
  },

  async commit({ projectId, commitBody }: IBackendCommitOptions) {
    await Promise.all(
      commitBody.actions.map((action) => doCommitAction(action, options)),
    );
    return {
      body: {
        ok: true,
      },
      headers: {},
    };
  },

  async listPipelines() {
    return {
      body: [],
      headers: {},
    };
  },

  async triggerPipeline() {
    return {
      body: {},
      headers: {},
    };
  },

  async getPipeline() {
    return {
      body: {},
      headers: {},
    };
  },

  async showBranch({ ref }) {
    return {
      body: {
        commit: {
          id: uuid(),
        },
        name: ref,
      },
      headers: {},
    };
  },
});
