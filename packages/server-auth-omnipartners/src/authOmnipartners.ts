import {
  authBase,
  IAuthBackend,
  IAuthBaseOptions,
  IAuthTokenData,
} from "@data-proxy/server";
import {
  IUser,
  IUserDataOptions,
  Omnipartners,
  OmnipartnersError,
} from "omnipartners";

export interface IAuthBaseMapOptions<FormattedUser>
  extends Omit<IAuthBaseOptions, "check" | "verifyPassword"> {
  omnipartners: Omnipartners;
  verifyUser?: (user: IUser) => false | Omit<IAuthTokenData, "login">;
  formatUser?: (user: IUser) => FormattedUser;
}

export const dataOptions: IUserDataOptions = [
  "-pet_details",
  "-preferences",
  "-loyalty_cards",
  "-access_rights",
];

export const authOmnipartners = <FormattedUser = any>({
  omnipartners,
  verifyUser,
  formatUser,
  ...options
}: IAuthBaseMapOptions<FormattedUser>): IAuthBackend =>
  authBase({
    ...options,
    check: async (login) => true,
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
          (err as OmnipartnersError).code !== "OP/OPStatusError/3" && // User not found in the system.
          (err as OmnipartnersError).code !== "OP/OPStatusError/4" && // User is found but not active in the system.
          (err as OmnipartnersError).code !== "OP/OPStatusError/5" && // Password is incorrect.
          (err as OmnipartnersError).code !== "OP/OPStatusError/17" && // Password not found.
          (err as OmnipartnersError).code !== "OP/OPStatusError/28" // Password does not meet the required specifications.
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
        user: formatUser ? formatUser(data) : data,
        verifyData,
      };
    },
  });
