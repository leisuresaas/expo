export type FsNode = {
  id: string;
  product_id: string;
  tenant_id: string;
  owner_subject: string;
  parent_id: string;
  name: string;
  kind: "folder" | "file" | string;
  object_id: string;
  content_type: string;
  size: number;
  status: "uploading" | "active" | string;
  created_at_unix: number;
  updated_at_unix: number;
};

export type FsUploadSessionResult = {
  node: FsNode;
  upload_url: string;
  upload_headers?: Record<string, string>;
  expires_unix: number;
  expires_at: string;
};

export type FsContentURLResult = {
  signed_url: string;
  expires_unix: number;
  expires_at: string;
  intent: string;
};

export type FsContentURLIntent = "preview" | "download" | "";

/** Client-side upload progress (bytes PUT never go through storage HTTP). */
export type UploadProgress = {
  loaded: number;
  total: number;
  /** 0..1 — Presigned PUT bytes only (not Finish/Complete duration). */
  ratio: number;
  /**
   * put — uploading bytes (ratio 0→1; 1 means PUT 2xx)
   * finishing — PUT done; Finish in flight (ratio stays 1; use separate copy)
   * done — Finish succeeded
   */
  phase?: "put" | "finishing" | "done";
};

/** Tenant Drive occupancy vs Plan byte Limit (same ledger as Complete). */
export type FsStorageUsage = {
  product_id: string;
  tenant_id: string;
  metric_key: string;
  bytes_used: number;
  objects_used: number;
  bytes_limit: number;
  /** null when bytes_limit === 0 */
  bytes_remaining: number | null;
};
