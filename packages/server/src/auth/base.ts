import Boom from "boom";
import jwt, { SignOptions } from "jsonwebtoken";
import { IOptionsAuth } from "../server";

export interface IAuthBaseOptions {
  jwtSecret: string;
  jwtSignOptions?: SignOptions;

  check: (login: string) => Promise<boolean>;
  verifyPassword: (login: string, password: string) => Promise<boolean>;
}

interface IAuthTokenData {
  login: string;
}

export const authBase = (options: IAuthBaseOptions): IOptionsAuth => ({
  authCheck: createAuthCheck(options),
  authLogin: createAuthLogin(options),
});

const createAuthCheck = (options: IAuthBaseOptions) => async (
  authorizationHeader: string,
) => {
  let data: IAuthTokenData | undefined;
  const [authType, token] = authorizationHeader.split(" ");

  if (authType !== "Bearer" || !token) {
    return false;
  }

  try {
    data = jwt.verify(token, options.jwtSecret) as any;
  } catch (err) {
    console.log(err)
    if (
      err.name !== "TokenExpiredError" &&
      err.name !== "JsonWebTokenError" &&
      err.name !== "NotBeforeError"
    ) {
      throw err;
    }

    throw Boom.badRequest(err.message)
  }

  if (typeof data === "undefined" || !data || !data.login) {
    return false;
  }

  return options.check(data.login);
};

const createAuthLogin = (options: IAuthBaseOptions) => async (body: any) => {
  if (typeof body !== "object") {
    return;
  }

  const { login, password } = body;
  if (!login || !password) {
    return;
  }

  if (!(await options.verifyPassword(login, password))) {
    return;
  }

  return jwt.sign(
    {
      login,
    },
    options.jwtSecret,
    options.jwtSignOptions,
  );
};
