import { AbstractAuthBridge, LocalStorageAuthBridge } from "@react-admin-git-provider/common";

export interface IAuthOptions {
  host: string;
  projectId: string;
  authBridge?: AbstractAuthBridge;
}

export const createAuthProvider = ({ host, projectId, authBridge = new LocalStorageAuthBridge() }: IAuthOptions) => async (
  type: string,
  params: { login: string; password: string },
) => {
  try {
    if (type === "AUTH_LOGIN") {
      const { login, password } = params;
      const res = await fetch(
        `${host}/__data-proxy__/${encodeURIComponent(
          projectId,
        )}/authenticate`,
        {
          body: JSON.stringify({ login, password }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "post",
        },
      );
      if (res.status < 200 || res.status >= 300) {
        throw new Error(res.statusText);
      }
      const { token } = await res.json();
      authBridge.setToken(token);
      return Promise.resolve();
    }
    if (type === "AUTH_LOGOUT") {
      authBridge.removeToken();
      return Promise.resolve();
    }
    if (type === "AUTH_ERROR") {
      return Promise.resolve();
    }
    if (type === "AUTH_CHECK") {
      return authBridge.getToken() ? Promise.resolve() : Promise.reject();
    }
    return Promise.reject("Unknown method");
  } catch (err) {
    console.error(err);
    return Promise.reject(err.message)
  }
};
