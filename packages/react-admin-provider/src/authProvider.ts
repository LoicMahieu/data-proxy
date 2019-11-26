import {
  AbstractAuthBridge,
  LocalStorageAuthBridge,
} from "@react-admin-git-provider/common";

export interface IAuthOptions {
  host: string;
  projectId: string;
  authBridge?: AbstractAuthBridge;
}

const pTry = async <T = any>(fn: () => Promise<T>): Promise<T | undefined> => {
  try {
    return await fn();
  } catch (err) {
    return;
  }
};

export const createAuthProvider = ({
  host,
  projectId,
  authBridge = new LocalStorageAuthBridge(),
}: IAuthOptions) => async (
  type: string,
  params: { login: string; password: string },
) => {
  try {
    if (type === "AUTH_LOGIN") {
      const { login, password } = params;
      const res = await fetch(
        `${host}/__data-proxy__/${encodeURIComponent(projectId)}/authenticate`,
        {
          body: JSON.stringify({ login, password }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "post",
        },
      );
      const json = await pTry(() => res.json());
      if (res.status < 200 || res.status >= 300) {
        throw new Error((json && json.message) || res.statusText);
      }
      if (json && json.token) {
        const { token } = await res.json();
        authBridge.setToken(token);
        return Promise.resolve();
      } else {
        return Promise.reject();
      }
    }
    if (type === "AUTH_LOGOUT") {
      authBridge.removeToken();
      return Promise.resolve();
    }
    if (type === "AUTH_ERROR") {
      return Promise.resolve();
    }
    if (type === "AUTH_CHECK") {
      const res = await fetch(
        `${host}/__data-proxy__/${encodeURIComponent(
          projectId,
        )}/authenticate-check`,
        {
          headers: {
            Authorization: "Bearer " + authBridge.getToken(),
            "Content-Type": "application/json",
          },
          method: "head",
        },
      );
      if (res.status < 200 || res.status >= 300) {
        return Promise.reject();
      }
      return authBridge.getToken() ? Promise.resolve() : Promise.reject();
    }

    if (type === "AUTH_GET_PERMISSIONS") {
      const res = await fetch(
        `${host}/__data-proxy__/${encodeURIComponent(projectId)}/permissions`,
        {
          headers: {
            Authorization: "Bearer " + authBridge.getToken(),
            "Content-Type": "application/json",
          },
          method: "get",
        },
      );
      if (res.status < 200 || res.status >= 300) {
        throw new Error(res.statusText);
      }

      return res.json();
    }
    return Promise.reject("Unknown method");
  } catch (err) {
    console.error(err);
    return Promise.reject(err.message);
  }
};
