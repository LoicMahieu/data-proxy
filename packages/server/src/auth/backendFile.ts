import { ILoadFileOptions, loadFile } from "../utils/loadFile";
import { IAuthBackend } from "./base";
import { authBaseMap, IAuthBaseMapOptions } from "./baseMap";

interface IAuthBackendFileOptions
  extends Omit<IAuthBaseMapOptions, "authMap" | "disableCheck">,
  ILoadFileOptions {}

export const authBackendFile = ({
  backend,
  path,
  projectId,
  ref,
  ...options
}: IAuthBackendFileOptions): IAuthBackend =>
  authBaseMap({
    ...options,
    authMap: async () => {
      const entities = await loadFile({
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
