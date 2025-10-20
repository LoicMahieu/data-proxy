import {
  AbstractAuthBridge,
  LocalStorageAuthBridge,
} from "@react-admin-git-provider/common";
import type { AuthProvider } from "react-admin";

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

const pathJoin = (...segments: string[]): string => {
  const parts = segments
    .filter((segment) => !!segment)
    .map((segment) => {
      return segment
        .toString()
        .split(/[\\/]+/)
        .filter((part) => !!part);
    })
    .flat();
  return parts.join("/");
};

export const createAuthProvider =
  ({
    host,
    projectId,
    authBridge = new LocalStorageAuthBridge(),
  }: IAuthOptions) =>
  (): AuthProvider => {
    const fetchProxy = async (uri: string, options: RequestInit) => {
      return fetch(
        pathJoin(host, "__data-proxy__", encodeURIComponent(projectId), uri),
        {
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...options.headers,
          },
        },
      );
    };

    return {
      async login(params) {
        const { username: login, password } = params;
        const res = await fetchProxy("/authenticate", {
          body: JSON.stringify({ login, password }),
          method: "post",
        });
        const json = await pTry(() => res.json());
        if (res.status < 200 || res.status >= 300) {
          throw new Error((json && json.message) || res.statusText);
        }
        if (json && json.token) {
          authBridge.setToken(json.token);
        } else {
          throw new Error("Invalid login or password");
        }
      },
      async checkError(error) {
        /* ... */
      },
      async checkAuth(params) {
        const token = authBridge.getToken();
        if (!token) {
          throw new Error("Unauthorized");
        }
        const res = await fetchProxy("/authenticate-check", {
          method: "head",
          headers: {
            Authorization: "Bearer " + token,
          },
        });
        if (res.status < 200 || res.status >= 300) {
          throw new Error(res.statusText);
        }
        if (!authBridge.getToken()) {
          throw new Error("login.required"); // react-admin passes the error message to the translation layer
        }
      },
      async logout() {
        authBridge.removeToken();
      },

      async getPermissions() {
        const res = await fetchProxy("/permissions", {
          headers: {
            Authorization: "Bearer " + authBridge.getToken(),
          },
        });
        if (res.status < 200 || res.status >= 300) {
          throw new Error(res.statusText);
        }

        return res.json();
      },
    };
  };
