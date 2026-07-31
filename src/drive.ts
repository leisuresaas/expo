import { LeisureSaasHttpError } from "./errors";
import { appBundleId } from "./ads/bundle-id";
import { mobilePlatform } from "./platform";
import { applyPublishableKeyHeaders } from "./publishable-key";
import type { MobilePlatform } from "./types";
import type {
  FsContentURLIntent,
  FsContentURLResult,
  FsNode,
  FsStorageUsage,
  FsUploadSessionResult,
  UploadProgress,
} from "./drive/types";

export type {
  FsContentURLIntent,
  FsContentURLResult,
  FsNode,
  FsStorageUsage,
  FsUploadSessionResult,
  UploadProgress,
} from "./drive/types";

/** Max body size for uploadFsFile auto PUT (matches Go SDK). */
export const DRIVE_UPLOAD_MAX_AUTO_PUT_BYTES = 20 * 1024 * 1024;

export type DriveRequestContext = {
  gatewayUrl: string;
  publishableKey: string;
  /** Required user OAuth access token. */
  accessToken: string;
  platform?: MobilePlatform | "web";
  bundleId?: string;
  origin?: string;
};

export type UploadProgressHandler = (progress: UploadProgress) => void;

function trimSlash(url: string): string {
  return url.replace(/\/$/, "");
}

function resolvePlatform(ctx: DriveRequestContext): MobilePlatform | "web" {
  return ctx.platform ?? mobilePlatform();
}

function driveHeaders(ctx: DriveRequestContext): Record<string, string> {
  const platform = resolvePlatform(ctx);
  const token = ctx.accessToken.trim();
  if (!token) {
    throw new LeisureSaasHttpError(401, "accessToken is required for Drive User Plane");
  }
  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    "X-Client-Platform": platform,
  };
  applyPublishableKeyHeaders(headers, ctx.publishableKey);
  if (platform === "web") {
    if (ctx.origin?.trim()) {
      headers.Origin = ctx.origin.trim();
    }
  } else {
    const bundle = (ctx.bundleId ?? appBundleId())?.trim();
    if (bundle) {
      headers["X-Ads-Bundle-Id"] = bundle;
    }
  }
  return headers;
}

async function driveRequest<T>(
  ctx: DriveRequestContext,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const base = `${trimSlash(ctx.gatewayUrl)}/api/v1/user/storage`;
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = driveHeaders(ctx);
  let payload: string | undefined;
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(url, { method, headers, body: payload });
  const text = await res.text();
  if (!res.ok) {
    throw new LeisureSaasHttpError(res.status, text.trim());
  }
  if (res.status === 204 || !text) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}

export async function listFsNodes(ctx: DriveRequestContext, parentId = ""): Promise<FsNode[]> {
  const q = parentId.trim() ? `?parent_id=${encodeURIComponent(parentId.trim())}` : "";
  const resp = await driveRequest<{ nodes?: FsNode[] }>(ctx, "GET", `/fs/nodes${q}`);
  return resp.nodes ?? [];
}

/** Tenant storage occupancy vs Plan Limit (User Plane GET /usage). */
export async function getFsStorageUsage(ctx: DriveRequestContext): Promise<FsStorageUsage> {
  return driveRequest<FsStorageUsage>(ctx, "GET", "/usage");
}

export async function getFsNode(ctx: DriveRequestContext, id: string): Promise<FsNode> {
  const nodeId = id.trim();
  if (!nodeId) throw new LeisureSaasHttpError(400, "id is required");
  return driveRequest<FsNode>(ctx, "GET", `/fs/nodes/${encodeURIComponent(nodeId)}`);
}

export async function createFsFolder(
  ctx: DriveRequestContext,
  input: { name: string; parentId?: string },
): Promise<FsNode> {
  const body: Record<string, string> = { name: input.name };
  if (input.parentId?.trim()) body.parent_id = input.parentId.trim();
  return driveRequest<FsNode>(ctx, "POST", "/fs/folders", body);
}

export async function renameFsNode(ctx: DriveRequestContext, id: string, name: string): Promise<FsNode> {
  const nodeId = id.trim();
  if (!nodeId) throw new LeisureSaasHttpError(400, "id is required");
  return driveRequest<FsNode>(ctx, "PATCH", `/fs/nodes/${encodeURIComponent(nodeId)}`, { name });
}

export async function moveFsNode(
  ctx: DriveRequestContext,
  id: string,
  parentId = "",
): Promise<FsNode> {
  const nodeId = id.trim();
  if (!nodeId) throw new LeisureSaasHttpError(400, "id is required");
  const body: Record<string, string> = {};
  if (parentId.trim()) body.parent_id = parentId.trim();
  return driveRequest<FsNode>(ctx, "POST", `/fs/nodes/${encodeURIComponent(nodeId)}/move`, body);
}

export async function deleteFsNode(
  ctx: DriveRequestContext,
  id: string,
  recursive = false,
): Promise<void> {
  const nodeId = id.trim();
  if (!nodeId) throw new LeisureSaasHttpError(400, "id is required");
  let path = `/fs/nodes/${encodeURIComponent(nodeId)}`;
  if (recursive) path += "?recursive=true";
  await driveRequest(ctx, "DELETE", path);
}

export async function createFsUploadSession(
  ctx: DriveRequestContext,
  input: { name: string; contentType: string; size: number; parentId?: string },
): Promise<FsUploadSessionResult> {
  // On active-name conflict the server auto-renames; use result.node.name as final display name.
  const body: Record<string, unknown> = {
    name: input.name,
    content_type: input.contentType,
    size: input.size,
  };
  if (input.parentId?.trim()) body.parent_id = input.parentId.trim();
  return driveRequest<FsUploadSessionResult>(ctx, "POST", "/fs/files/upload-session", body);
}

export async function finishFsUploadSession(ctx: DriveRequestContext, nodeId: string): Promise<FsNode> {
  const id = nodeId.trim();
  if (!id) throw new LeisureSaasHttpError(400, "node id is required");
  return driveRequest<FsNode>(ctx, "POST", `/fs/files/upload-session/${encodeURIComponent(id)}/finish`, {});
}

export async function createFsContentURL(
  ctx: DriveRequestContext,
  id: string,
  input?: { intent?: FsContentURLIntent; ttlSeconds?: number },
): Promise<FsContentURLResult> {
  const nodeId = id.trim();
  if (!nodeId) throw new LeisureSaasHttpError(400, "id is required");
  const body: Record<string, unknown> = {};
  if (input?.intent) body.intent = input.intent;
  if (input?.ttlSeconds && input.ttlSeconds > 0) body.ttl_seconds = input.ttlSeconds;
  return driveRequest<FsContentURLResult>(
    ctx,
    "POST",
    `/fs/nodes/${encodeURIComponent(nodeId)}/content-url`,
    body,
  );
}

function reportProgress(
  onProgress: UploadProgressHandler | undefined,
  loaded: number,
  total: number,
  phase?: UploadProgress["phase"],
) {
  if (!onProgress) return;
  const t = total > 0 ? total : 0;
  const ratio = t > 0 ? Math.min(1, Math.max(0, loaded / t)) : 0;
  onProgress({ loaded, total: t, ratio, phase });
}

/** Monotonic byte progress reporter. */
function createProgressReporter(onProgress: UploadProgressHandler | undefined, total: number) {
  let maxLoaded = 0;
  return {
    report(loaded: number, opts?: { complete?: boolean; phase?: UploadProgress["phase"] }) {
      if (!onProgress) return;
      const t = total > 0 ? total : 0;
      let next = Math.max(0, loaded);
      if (next < maxLoaded) next = maxLoaded;
      if (opts?.complete && t > 0) next = t;
      maxLoaded = next;
      reportProgress(onProgress, next, t, opts?.phase ?? "put");
    },
  };
}

function asUploadBody(body: ArrayBuffer | Blob | Uint8Array): BodyInit {
  if (body instanceof Uint8Array) return body as unknown as BodyInit;
  if (typeof ArrayBuffer !== "undefined" && body instanceof ArrayBuffer) {
    return new Uint8Array(body) as unknown as BodyInit;
  }
  return body as BodyInit;
}

/**
 * PUT to Presigned upload_url (object store). Progress is client-local; body never hits storage HTTP.
 * ratio → 1 when the body has been fully sent; then phase "storing" until object store returns 2xx.
 * If the bar resets many times, check that upload_url has no HTTP redirects.
 */
export async function putFsUploadURL(
  uploadURL: string,
  uploadHeaders: Record<string, string> | undefined,
  contentType: string,
  body: ArrayBuffer | Blob | Uint8Array,
  opts?: { size?: number; onProgress?: UploadProgressHandler },
): Promise<void> {
  const headers: Record<string, string> = { ...(uploadHeaders ?? {}) };
  if (!headers["Content-Type"] && !headers["content-type"] && contentType) {
    headers["Content-Type"] = contentType;
  }
  let total = opts?.size ?? 0;
  if (total <= 0) {
    if (typeof Blob !== "undefined" && body instanceof Blob) total = body.size;
    else if (body instanceof Uint8Array) total = body.byteLength;
    else if (typeof ArrayBuffer !== "undefined" && body instanceof ArrayBuffer) total = body.byteLength;
  }
  const progress = createProgressReporter(opts?.onProgress, total);

  if (opts?.onProgress && typeof XMLHttpRequest !== "undefined") {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadURL);
      for (const [k, v] of Object.entries(headers)) {
        if (v != null && v !== "") xhr.setRequestHeader(k, v);
      }
      xhr.upload.onprogress = (ev) => {
        progress.report(ev.loaded, { phase: "put" });
      };
      // Body fully handed to the stack — bar at 100%; wait for object-store 2xx under "storing".
      xhr.upload.onload = () => {
        progress.report(total > 0 ? total : 1, { complete: true, phase: "storing" });
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          progress.report(total > 0 ? total : 1, { complete: true, phase: "storing" });
          resolve();
          return;
        }
        reject(new LeisureSaasHttpError(xhr.status, (xhr.responseText || "upload PUT failed").trim()));
      };
      xhr.onerror = () => reject(new LeisureSaasHttpError(0, "upload PUT network error"));
      xhr.onabort = () => reject(new LeisureSaasHttpError(0, "upload PUT aborted"));
      progress.report(0, { phase: "put" });
      xhr.send(asUploadBody(body) as XMLHttpRequestBodyInit);
    });
    return;
  }

  // fetch: no body-sent signal — jump to storing only after 2xx (put+storing collapsed).
  progress.report(0, { phase: "put" });
  const res = await fetch(uploadURL, {
    method: "PUT",
    headers,
    body: asUploadBody(body),
    redirect: "manual",
  });
  if (res.type === "opaqueredirect" || (res.status >= 300 && res.status < 400)) {
    throw new LeisureSaasHttpError(
      res.status || 0,
      "upload PUT redirected; set object_store public/client endpoint to the final S3 API host with no redirects",
    );
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new LeisureSaasHttpError(res.status, text.trim() || "upload PUT failed");
  }
  progress.report(total > 0 ? total : 1, { complete: true, phase: "storing" });
}

/** CreateFsUploadSession → PUT upload_url → FinishFsUploadSession (≤ 20 MiB). */
export async function uploadFsFile(
  ctx: DriveRequestContext,
  input: {
    name: string;
    contentType: string;
    size: number;
    body: ArrayBuffer | Blob | Uint8Array;
    parentId?: string;
    /**
     * put: ratio 0→1 as bytes send; storing: wait for object-store 2xx (ratio 1);
     * finishing: platform Finish; done: success. Use phase for copy; bar only tracks put.
     */
    onProgress?: UploadProgressHandler;
  },
): Promise<FsNode> {
  if (input.size <= 0) {
    throw new LeisureSaasHttpError(400, "size must be positive");
  }
  if (input.size > DRIVE_UPLOAD_MAX_AUTO_PUT_BYTES) {
    throw new LeisureSaasHttpError(
      400,
      `body exceeds max auto-PUT size (${DRIVE_UPLOAD_MAX_AUTO_PUT_BYTES} bytes)`,
    );
  }
  const sess = await createFsUploadSession(ctx, {
    name: input.name,
    contentType: input.contentType,
    size: input.size,
    parentId: input.parentId,
  });
  await putFsUploadURL(sess.upload_url, sess.upload_headers, input.contentType, input.body, {
    size: input.size,
    onProgress: input.onProgress,
  });
  if (input.onProgress) {
    input.onProgress({
      loaded: input.size,
      total: input.size,
      ratio: 1,
      phase: "finishing",
    });
  }
  const node = await finishFsUploadSession(ctx, sess.node.id);
  if (input.onProgress) {
    input.onProgress({
      loaded: input.size,
      total: input.size,
      ratio: 1,
      phase: "done",
    });
  }
  return node;
}
