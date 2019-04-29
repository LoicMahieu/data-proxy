import bcrypt from "bcrypt";
import { Omit } from "type-fest";
import { authBase, IAuthBackend, IAuthBaseOptions } from "./base";

interface IAuthBaseMapOptions extends Omit<IAuthBaseOptions, "check" | "verifyPassword"> {
  getAuthMap: () => Promise<IAuthMap>;
}

interface IAuthMap {
  [login: string]: string;
}

export const authBaseMap = (options: IAuthBaseMapOptions): IAuthBackend =>
  authBase({
    ...options,
    check: async login => {
      const authMap = await options.getAuthMap();
      return !!authMap[login];
    },
    verifyPassword: async (login, password) => {
      const authMap = await options.getAuthMap();
      const encodedPassword = authMap[login];
      if (!encodedPassword) {
        return false;
      }
      return bcrypt.compare(password, encodedPassword);
    },
  });

