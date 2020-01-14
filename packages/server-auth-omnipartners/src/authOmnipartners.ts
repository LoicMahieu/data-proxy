import { authBase, IAuthBackend, IAuthBaseOptions, IAuthTokenData } from "@data-proxy/server";
import { IUser, IUserDataOptions, Omnipartners } from "omnipartners";

export interface IAuthBaseMapOptions
  extends Omit<IAuthBaseOptions, "check" | "verifyPassword"> {
  omnipartners: Omnipartners;
  verifyUser?: (user: IUser) => false | Omit<IAuthTokenData, "login">;
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
      let data: IUser | void;

      try {
        data = await omnipartners.identity.authenticate({
          data_options: dataOptions,
          identifier: login,
          password,
        });
      } catch (err) {
        if (
          err.code !== "OP/OPStatusError/3" &&
          err.code !== "OP/OPStatusError/4" &&
          err.code !== "OP/OPStatusError/5" &&
          err.code !== "OP/OPStatusError/28" // Password does not meet the required specifications.
        ) {
          throw err;
        }

        return false;
      }

      const verifyData =
        typeof verifyUser === "function" ? await verifyUser(data) : {};

      if (!verifyData) {
        return false;
      }

      return {
        user: data,
        verifyData,
      };
    },
  });
