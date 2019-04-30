import bcrypt from "bcrypt";
import { Omit } from "type-fest";
import { authBase, IAuthBackend, IAuthBaseOptions } from "./base";

export interface IAuthBaseMapOptions extends Omit<IAuthBaseOptions, "check" | "verifyPassword"> {
  authMap: IAuthMap | (() => Promise<IAuthMap>);
  disableCheck: boolean;
}

interface IAuthMap {
  [login: string]: string;
}

export const authBaseMap = (options: IAuthBaseMapOptions): IAuthBackend =>
  authBase({
    ...options,
    check: async login => {
      if (options.disableCheck) {
        return true
      }
      const authMap = typeof options.authMap === 'function' ? await options.authMap() : options.authMap;
      return !!authMap[login];
    },
    verifyPassword: async (login, password) => {
      const authMap = typeof options.authMap === 'function' ? await options.authMap() : options.authMap;
      const encodedPassword = authMap[login];
      if (!encodedPassword) {
        return false;
      }
      return bcrypt.compare(password, encodedPassword);
    },
  });

