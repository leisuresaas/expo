import { LeisureSaasHttpError } from "./errors";

export type HttpMethod = "GET" | "POST";

export type RequestOptions = {
  method?: HttpMethod;
  accessToken: string;
  integrationApiKey?: string;
  headers?: Record<string, string>;
  body?: unknown;
};

function trimSlash(url: string): string {
  return url.replace(/\/$/, "");
}

export async function requestJson<T>(baseUrl: string, path: string, opts: RequestOptions): Promise<T> {
  const url = `${trimSlash(baseUrl)}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${opts.accessToken}`,
    Accept: "application/json",
    ...(opts.headers ?? {}),
  };
  if (opts.integrationApiKey) {
    headers["X-Integration-Key"] = opts.integrationApiKey;
  }
  let body: string | undefined;
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  const res = await fetch(url, { method: opts.method ?? "GET", headers, body });
  const text = await res.text();
  if (!res.ok) {
    throw new LeisureSaasHttpError(res.status, text.trim());
  }
  if (!text) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}
