import jwt, { SignOptions } from "jsonwebtoken";

export interface IAuthBaseOptions {
  jwtSecret: string;
  jwtSignOptions?: SignOptions;

  check: (login?: string) => Promise<boolean>;
  verifyPassword: (
    login: string,
    password: string,
  ) => Promise<false | Omit<IAuthTokenData, "login">>;
}

export interface IAuthBackend {
  authCheck: (authorizationHeader?: string) => Promise<false | IAuthTokenData>;
  authLogin: (body: any) => Promise<string | undefined>;
}

export interface IAuthTokenData {
  login: string;
  [key: string]: any
}

export const authBase = (options: IAuthBaseOptions): IAuthBackend => ({
  authCheck: createAuthCheck(options),
  authLogin: createAuthLogin(options),
});

const createAuthCheck = (options: IAuthBaseOptions) => async (
  authorizationHeader?: string,
) => {
  let data: IAuthTokenData | undefined;
  const [authType, token] = authorizationHeader ? authorizationHeader.split(" ") : ["", ""];

  if (authType !== "Bearer" || !token) {
    return false;
  }

  try {
    data = jwt.verify(token, options.jwtSecret) as any;
  } catch (err) {
    if (
      (err as Error).name !== "TokenExpiredError" &&
      (err as Error).name !== "JsonWebTokenError" &&
      (err as Error).name !== "NotBeforeError"
    ) {
      throw err;
    }
  }

  if (
    typeof data === "undefined" ||
    !data ||
    !data.login ||
    !(await options.check(data.login))
  ) {
    return false;
  }

  return data;
};

const createAuthLogin = (options: IAuthBaseOptions) => async (body: any) => {
  if (typeof body !== "object") {
    return;
  }

  const { login, password } = body;
  if (!login || !password) {
    return;
  }

  const data = await options.verifyPassword(login, password);

  if (!data) {
    return;
  }

  return jwt.sign(
    {
      login,
      ...data,
    },
    options.jwtSecret,
    options.jwtSignOptions,
  );
};
