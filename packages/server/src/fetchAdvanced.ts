import { join as pathJoin } from "path";

type FetchAdvancedResponse<T> = {
  body: T;
  headers: Record<string, string>;
  status: number;
  statusText: string;
  response: Response;
};

export const fetchAdvanced = async <T = any, B = Record<string, any> | string>(
  url: string,
  {
    timeout = 30000,
    autoParseJson,
    baseUrl,
    body: bodyGiven,
    ...options
  }: Omit<RequestInit, "body"> & {
    timeout?: number;
    autoParseJson?: boolean;
    baseUrl?: string;
    body?: B;
  } = {},
): Promise<FetchAdvancedResponse<T>> => {
  const controller = new AbortController();
  const signal = controller.signal;

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  const fullUrl = baseUrl ? pathJoin(baseUrl, url) : url;

  try {
    const response = await fetch(fullUrl, {
      ...options,
      signal,
      body:
        bodyGiven && typeof bodyGiven === "string"
          ? bodyGiven
          : JSON.stringify(bodyGiven),
    });
    const responseClone = response.clone();
    if (!response.ok) {
      console.error(
        `Error HTTP: ${response.status} ${response.statusText} for ${url}`,
      );
      throw new FetchAdvancedResponseError(
        `Error HTTP: ${response.status} ${response.statusText} for ${url}`,
        responseClone,
      );
    }

    let body: T;
    if (autoParseJson) {
      body = await response.json();
    } else {
      body = (await response.text()) as T;
    }
    return {
      body,
      headers: Object.fromEntries(response.headers.entries()),
      status: response.status,
      statusText: response.statusText,
      response: responseClone,
    };
  } catch (error) {
    if ((error as any).name === "AbortError") {
      throw new FetchAdvancedResponseError(
        `Error : Timeout of ${timeout}ms exceeded for ${url}`,
        new Response("Timeout", { status: 504 }),
      );
    } else {
      throw new FetchAdvancedResponseError(
        `Error while fetching ${url}: ${(error as any).message}`,
        new Response("Error", { status: 500, statusText: (error as any).message }),
      );
    }
  } finally {
    clearTimeout(timeoutId);
  }
};

export class FetchAdvancedResponseError extends Error {
  response: Response;
  constructor(message: string, response: Response) {
    super(message);
    this.name = "FetchAdvancedResponseError";
    this.response = response;
  }
}
