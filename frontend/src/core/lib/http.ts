import { Injectable, inject } from "@angular/core";
import { Router } from "@angular/router";

// Angular uses environment.ts for env vars, not import.meta.env
const API_BASE_DEV = "http://localhost:8000";
const API_BASE_PROD = "https://genova-backend-production.up.railway.app";

export const API_BASE =
  (typeof window !== "undefined" &&
    ((window as unknown as Record<string, unknown>).__GENOVA_API_BASE__ as string)) ||
  (location.hostname === "localhost" ? API_BASE_DEV : API_BASE_PROD);

const DEFAULT_TIMEOUT_MS = 15_000;
const AUTH_PATHS = new Set(["/api/auth/me", "/auth/login", "/auth/register"]);

export interface HttpErrorOptions {
  status?: number;
  code?: string;
  body?: unknown;
}

interface JsonBody {
  message?: string;
  detail?: string;
  error?: string;
}

export class HttpError extends Error {
  status: number;
  code: string;
  body: unknown;

  constructor(message: string, { status = 0, code = "", body = null }: HttpErrorOptions = {}) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

function isAuthEndpoint(path: string): boolean {
  return AUTH_PATHS.has(path) || path.startsWith("/api/auth/") || path.startsWith("/auth/");
}

/**
 * Standalone fetch wrapper — mirrors the React frontend's apiFetch().
 * Always sends credentials (httpOnly JWT cookie).
 */
export async function apiFetch(
  path: string,
  init: RequestInit = {},
  { timeoutMs = DEFAULT_TIMEOUT_MS }: { timeoutMs?: number } = {},
): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  const initHeaders = (init.headers as Record<string, string>) || {};
  const baseHeaders: Record<string, string> = { "X-Requested-With": "XMLHttpRequest" };

  if (init.body && !isFormData && !initHeaders["Content-Type"]) {
    baseHeaders["Content-Type"] = "application/json";
  }

  const headers = { ...baseHeaders, ...initHeaders };
  const url = /^https?:/i.test(path) ? path : `${API_BASE}${path}`;

  try {
    const res = await fetch(url, { ...init, headers, credentials: "include", signal: ctrl.signal });

    // 401 on protected endpoint → session expired; AuthGuard will redirect.
    if (res.status === 401 && !isAuthEndpoint(path)) {
      AuthExpiredBus.notify();
    }

    return res;
  } finally {
    clearTimeout(t);
  }
}

export async function apiJson<T = unknown>(
  path: string,
  init: RequestInit = {},
  opts: { timeoutMs?: number } = {},
): Promise<T> {
  const res = await apiFetch(path, init, opts);
  let body: JsonBody | null = null;

  try {
    body = await res.json();
  } catch {
    /* no JSON body */
  }

  if (!res.ok) {
    const message = body?.message || body?.detail || `HTTP ${res.status}`;
    throw new HttpError(message, { status: res.status, code: body?.error || "", body });
  }

  return (body ?? {}) as T;
}

/**
 * Simple event bus for 401 session-expired notifications.
 * AuthService subscribes; avoids circular DI.
 */
export const AuthExpiredBus = {
  _listeners: new Set<() => void>(),
  notify() {
    this._listeners.forEach((fn) => fn());
  },
  subscribe(fn: () => void) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  },
};

/**
 * Injectable wrapper for use in Angular services via DI.
 */
@Injectable({ providedIn: "root" })
export class HttpClient {
  private router = inject(Router);

  constructor() {
    AuthExpiredBus.subscribe(() => {
      this.router.navigate(["/login"], { queryParams: { expired: "1" } });
    });
  }

  fetch = apiFetch;
  json = apiJson;
}
