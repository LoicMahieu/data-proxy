import flatten from "lodash/flatten";
import { IBackend } from "../backend/interface";

export interface ILoadFileListOptions {
  backend: IBackend;
  path: string;
  projectId: string;
  ref: string;
}

export const loadFileList = async (options: ILoadFileListOptions) => {
  const { entities, headers } = await loadEntitiesForPage(1, options);
  const totalPage = parseInt(`${headers["x-total-pages"] || "1"}`, 10) - 1;
  const pages = Array(totalPage).fill(0);

  const nextEntites = await Promise.all(
    pages.map(async (z, page) => {
      const { entities: pageEntities } = await loadEntitiesForPage(
        page + 2,
        options,
      );
      return pageEntities;
    }),
  );

  return [...entities, ...flatten(nextEntites)];
};

const loadEntitiesForPage = async (
  page: number,
  { backend, path, projectId, ref }: ILoadFileListOptions,
) => {
  const { body: files, headers } = await backend.tree({
    page: `${page}`,
    path,
    projectId,
    ref,
  });

  return {
    entities: await Promise.all(
      files.map(async file => {
        const { body: fileContent } = await backend.readFile({
          file: file.path,
          projectId,
          ref,
        });
        return JSON.parse(
          Buffer.from(fileContent.content, fileContent.encoding).toString(
            "utf8",
          ),
        );
      }),
    ),
    headers,
  };
};
