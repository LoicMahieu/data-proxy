import { IBackend } from "../backend/interface";

export interface ILoadFileOptions {
  backend: IBackend;
  path: string;
  projectId: string;
  ref: string;
}

export const loadFile = async ({
  backend,
  path,
  projectId,
  ref,
}: ILoadFileOptions) => {
  const { body: fileContent } = await backend.readFile({
    file: path,
    projectId,
    ref,
  });
  return JSON.parse(
    Buffer.from(fileContent.content, fileContent.encoding).toString("utf8"),
  ) as any[];
};
