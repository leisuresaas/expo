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
