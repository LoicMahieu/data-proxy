import { Omit } from "type-fest";
import { IBackend } from "../backend/interface";
import { IAuthBackend } from "./base";
import { authBaseMap, IAuthBaseMapOptions } from "./baseMap";

interface IAuthBackendFileListOptions
  extends Omit<IAuthBaseMapOptions, "authMap" | "disableCheck"> {
  backend: IBackend;
  projectId: string;
  ref: string;
  path: string;
}

export const authBackendFileList = ({
  backend,
  projectId,
  ref,
  path,
  ...options
}: IAuthBackendFileListOptions): IAuthBackend =>
  authBaseMap({
    ...options,
    authMap: async () => {
      const { body: files } = await backend.tree({
        page: "1",
        path,
        projectId,
        ref,
      });
      const contents = await Promise.all(
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
      );
      const authMap = contents
        .filter(item => Boolean(item.login) && Boolean(item.password))
        .reduce((res, item) => {
          res[item.login] = item.password;
          return res;
        }, {});
      return authMap;
    },
    disableCheck: true,
  });
