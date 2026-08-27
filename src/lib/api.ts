const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "DISPATCHER";
  accountType: "INDIVIDUAL" | "COMPANY";
  accountId: string;
  accountName: string;
  currency?: string;
  isFullAccess?: boolean;
};

type ApiOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("td_token");
}

export function setStoredToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem("td_token", token);
  else localStorage.removeItem("td_token");
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const token = options.token !== undefined ? options.token : getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? (options.body ? "POST" : "GET"),
    headers,
    credentials: "include",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      (data as { error?: string }).error ?? "Request failed",
      res.status
    );
  }
  return data as T;
}

/** Multipart upload (no Content-Type — browser sets boundary) */
export async function apiForm<T>(path: string, form: FormData): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers,
    credentials: "include",
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      (data as { error?: string }).error ?? "Upload failed",
      res.status
    );
  }
  return data as T;
}

export function isRemoteFileUrl(path: string): boolean {
  return /^https?:\/\//i.test(path);
}

export function apiFileUrl(path: string, opts?: { inline?: boolean }): string {
  if (isRemoteFileUrl(path)) return path;
  const url = `${API_URL}${path}`;
  if (!opts?.inline) return url;
  const join = path.includes("?") ? "&" : "?";
  return `${url}${join}inline=1`;
}

/** Resolve a file for preview: Cloudinary URLs are used directly; local API files as blobs. */
export async function fetchFileObjectUrl(
  path: string
): Promise<{ url: string; mimeType: string; revoke: () => void }> {
  if (isRemoteFileUrl(path)) {
    const lower = path.toLowerCase();
    let mimeType = "application/octet-stream";
    if (/\.(jpe?g|jpg)(\?|$)/i.test(lower) || lower.includes("/image/")) {
      mimeType = "image/jpeg";
    } else if (/\.png(\?|$)/i.test(lower)) {
      mimeType = "image/png";
    } else if (/\.webp(\?|$)/i.test(lower)) {
      mimeType = "image/webp";
    } else if (/\.gif(\?|$)/i.test(lower)) {
      mimeType = "image/gif";
    } else if (/\.pdf(\?|$)/i.test(lower) || lower.includes("/raw/")) {
      mimeType = "application/pdf";
    } else if (lower.includes("/image/upload/")) {
      mimeType = "image/jpeg";
    }
    return { url: path, mimeType, revoke: () => undefined };
  }

  const token = getStoredToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(apiFileUrl(path, { inline: true }), {
    headers,
    credentials: "include",
  });
  if (!res.ok) {
    throw new ApiError("Could not load file", res.status);
  }
  const mimeType =
    res.headers.get("content-type")?.split(";")[0]?.trim() ||
    "application/octet-stream";
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  return {
    url,
    mimeType,
    revoke: () => URL.revokeObjectURL(url),
  };
}
