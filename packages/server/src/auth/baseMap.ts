import bcrypt from "bcrypt";
import { Omit } from "type-fest";
import { authBase, IAuthBackend, IAuthBaseOptions } from "./base";

interface IAuthBaseMapOptions extends Omit<IAuthBaseOptions, "check" | "verifyPassword"> {
  authMap: IAuthMap | (() => Promise<IAuthMap>);
}

interface IAuthMap {
  [login: string]: string;
}

export const authBaseMap = (options: IAuthBaseMapOptions): IAuthBackend =>
  authBase({
    ...options,
    check: async login => {
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

