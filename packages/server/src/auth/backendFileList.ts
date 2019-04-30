import { Omit } from "type-fest";
import { ILoadFileListOptions, loadFileList } from "../utils/loadFileList";
import { IAuthBackend } from "./base";
import { authBaseMap, IAuthBaseMapOptions } from "./baseMap";

interface IAuthBackendFileListOptions
  extends Omit<IAuthBaseMapOptions, "authMap" | "disableCheck">,
  ILoadFileListOptions {}

export const authBackendFileList = ({
  backend,
  path,
  projectId,
  ref,
  ...options
}: IAuthBackendFileListOptions): IAuthBackend =>
  authBaseMap({
    ...options,
    authMap: async () => {
      const entities = await loadFileList({
        backend,
        path,
        projectId,
        ref,
      });
      const authMap = entities
        .filter(item => Boolean(item.login) && Boolean(item.password))
        .reduce((res, item) => {
          res[item.login] = item.password;
          return res;
        }, {});
      return authMap;
    },
    disableCheck: true,
  });
