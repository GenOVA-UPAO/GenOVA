import { AuthExpiredBus } from "./auth-expired-bus";

// Re-export: los consumidores históricos (AuthService, guards) importan el bus
// desde http.ts; el módulo puro existe para los tests unit sin Angular.
export { AuthExpiredBus };

/** Valores de `GENOVA_API_BASE_*` inyectados por scripts/run-with-api-env.mjs. */
function buildApiBases(): { prod: string; develop: string } {
  // typeof es seguro si el build no paso --define (tests / ngc).
  return {
    prod: typeof GENOVA_API_BASE_PROD === "string" ? GENOVA_API_BASE_PROD : "",
    develop: typeof GENOVA_API_BASE_DEVELOP === "string" ? GENOVA_API_BASE_DEVELOP : "",
  };
}

function resolveApiBase(): string {
  const { prod, develop } = buildApiBases();
  if (typeof window === "undefined") return prod;

  const override = (window as unknown as Record<string, unknown>)["__GENOVA_API_BASE__"];
  if (typeof override === "string" && override.length > 0) return override;

  // Local: ng serve + proxy → same-origin (las URLs de .env no se usan aqui).
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    return location.origin;
  }

  // Preview Vercel de develop → GENOVA_API_BASE_DEVELOP.
  if (location.hostname.includes("-git-develop-")) {
    return develop || prod;
  }

  return prod;
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

/**
 * apiFetch + parseo JSON. En error lanza HttpError con `message`/`detail` del
 * backend, o `fallbackMsg` si el cuerpo no trae ninguno.
 */
export async function apiJson<T = unknown>(
  path: string,
  init: RequestInit = {},
  opts: { timeoutMs?: number; fallbackMsg?: string } = {},
): Promise<T> {
  const res = await apiFetch(path, init, opts);
  let body: JsonBody | null = null;

  try {
    body = await res.json();
  } catch {
    /* no JSON body */
  }

  if (!res.ok) {
    const message = body?.message || body?.detail || opts.fallbackMsg || `HTTP ${res.status}`;
    throw new HttpError(message, { status: res.status, code: body?.error || "", body });
  }

  return (body ?? {}) as T;
}
