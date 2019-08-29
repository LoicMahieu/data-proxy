const KEY = "react-admin.data-proxy.token";

export function getToken() {
  return window.localStorage.getItem(KEY) || undefined;
}
export function setToken(value: string) {
  return window.localStorage.setItem(KEY, value);
}
export function removeToken() {
  return window.localStorage.removeItem(KEY);
}

export interface IAuthOptions {
  host: string;
  projectId: string;
}

export const createAuthProvider = ({ host, projectId }: IAuthOptions) => async (
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
      setToken(token);
      return Promise.resolve();
    }
    if (type === "AUTH_LOGOUT") {
      removeToken();
      return Promise.resolve();
    }
    if (type === "AUTH_ERROR") {
      return Promise.resolve();
    }
    if (type === "AUTH_CHECK") {
      return getToken() ? Promise.resolve() : Promise.reject();
    }
    return Promise.reject("Unknown method");
  } catch (err) {
    console.error(err);
    return Promise.reject(err.message)
  }
};
