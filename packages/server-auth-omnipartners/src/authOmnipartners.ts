import {
  authBase,
  IAuthBackend,
  IAuthBaseOptions,
} from "@git-data-proxy/server";
import { IUser, IUserDataOptions, Omnipartners } from "omnipartners";
import { Omit } from "type-fest";

export interface IAuthBaseMapOptions
  extends Omit<IAuthBaseOptions, "check" | "verifyPassword"> {
  omnipartners: Omnipartners;
  verifyUser?: (user: IUser) => Promise<boolean>;
}

export const dataOptions: IUserDataOptions = [
  "-pet_details",
  "-preferences",
  "-loyalty_cards",
  "-access_rights",
];

export const authOmnipartners = ({
  omnipartners,
  verifyUser,
  ...options
}: IAuthBaseMapOptions): IAuthBackend =>
  authBase({
    ...options,
    check: async login => true,
    verifyPassword: async (login, password) => {
      const data = await omnipartners.identity.authenticate({
        data_options: dataOptions,
        identifier: login,
        password,
      });

      if (typeof verifyUser === "function") {
        return verifyUser(data);
      }

      return true;
    },
  });
