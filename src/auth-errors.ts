export type AuthLoginErrorCode = "cancelled" | "no_code" | "exchange_failed" | "not_ready";

const STABLE_MESSAGES: Record<AuthLoginErrorCode, string> = {
  cancelled: "Cancelled",
  no_code: "Did not redirect",
  exchange_failed: "Login failed",
  not_ready: "Login failed",
};

function causeSummary(cause: unknown): string {
  if (cause == null) {
    return "";
  }
  if (cause instanceof Error && cause.message.trim()) {
    return cause.message.trim();
  }
  if (typeof cause === "string" && cause.trim()) {
    return cause.trim();
  }
  try {
    return String(cause);
  } catch {
    return "";
  }
}

/** Stable OAuth login failure for product UI; use `message` only outside __DEV__. */
export class AuthLoginError extends Error {
  readonly code: AuthLoginErrorCode;
  readonly cause?: unknown;

  constructor(code: AuthLoginErrorCode, cause?: unknown) {
    const stable = STABLE_MESSAGES[code];
    const detail = typeof __DEV__ !== "undefined" && __DEV__ ? causeSummary(cause) : "";
    super(detail ? `${stable}: ${detail}` : stable);
    this.name = "AuthLoginError";
    this.code = code;
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

export function toAuthLoginError(code: AuthLoginErrorCode, cause?: unknown): AuthLoginError {
  const err = new AuthLoginError(code, cause);
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    console.warn(`[AuthProvider] login ${code}`, cause ?? err.message);
  }
  return err;
}
