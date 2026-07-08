import { inject, Injectable } from "@angular/core";
import { Router } from "@angular/router";

import { AuthExpiredBus } from "./auth-expired-bus";

// Re-export: los consumidores históricos (AuthService, guards) importan el bus
// desde http.ts; el módulo puro existe para los tests unit sin Angular.
export { AuthExpiredBus };

// Angular uses environment.ts for env vars, not import.meta.env
const API_BASE_PROD = "https://genova-backend-production.up.railway.app";
const API_BASE_DEVELOP = "https://genova-backend-develop.up.railway.app";

function resolveApiBase(): string {
  if (typeof window === "undefined") return API_BASE_PROD;

  const override = (window as unknown as Record<string, unknown>)["__GENOVA_API_BASE__"];
  if (typeof override === "string" && override.length > 0) return override;

  // Local dev: ng serve + proxy.conf.json → same-origin requests to Railway backend.
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    return location.origin;
  }

  // Vercel previews de develop → backend del entorno develop de Railway
  // (audit 2026-07-06 #1: apuntaban a producción y CORS rompía la app).
  if (location.hostname.includes("-git-develop-")) {
    return API_BASE_DEVELOP;
  }

  return API_BASE_PROD;
}

export const API_BASE = resolveApiBase();

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
  const t = setTimeout(() => {
    ctrl.abort();
  }, timeoutMs);
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
 * GET que resuelve a JSON; en error usa `detail` del backend o el mensaje dado.
 */
export async function apiGetJson(path: string, fallbackMsg: string): Promise<unknown> {
  const res = await apiFetch(path);
  if (!res.ok) throw new Error(await extractDetail(res, fallbackMsg));
  return res.json();
}

/**
 * PUT JSON que resuelve a JSON; en error usa `detail` del backend o el mensaje dado.
 */
export async function apiPutJson(
  path: string,
  body: unknown,
  fallbackMsg: string,
): Promise<unknown> {
  const res = await apiFetch(path, { method: "PUT", body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await extractDetail(res, fallbackMsg));
  return res.json();
}

async function extractDetail(res: Response, fallbackMsg: string): Promise<string> {
  try {
    const b = (await res.json()) as { detail?: string; message?: string };
    return b.detail || b.message || fallbackMsg;
  } catch {
    return fallbackMsg;
  }
}

/**
 * Injectable wrapper for use in Angular services via DI.
 */
@Injectable({ providedIn: "root" })
export class HttpClient {
  private router = inject(Router);

  constructor() {
    AuthExpiredBus.subscribe(() => {
      void this.router.navigate(["/login"], { queryParams: { expired: "1" } });
    });
  }

  fetch = apiFetch;
  json = apiJson;
}
