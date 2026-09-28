import { apiFetch } from "@/core/lib/http";

/**
 * Framework-free auth API + session cache. React state lives in
 * `auth-context.tsx`; this module is importable from Node tests too.
 */
export interface MeUser {
  id?: string | number;
  role?: string;
  email?: string;
  full_name?: string;
  permissions?: string[];
  theme_settings?: unknown;
  [key: string]: unknown;
}

export interface AuthMessageData {
  message?: string;
  error?: string;
  totp_required?: boolean;
  ticket?: string;
  retry_after_minutes?: number;
  email_verification_required?: boolean;
}

const STORAGE_KEY = "genova_me";

export function readCachedUser(): MeUser | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MeUser) : null;
  } catch {
    return null;
  }
}

export function writeCachedUser(user: MeUser): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch {
    /* storage unavailable */
  }
}

export function clearCachedUser(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * GET /api/auth/me. Returns the user, or null when not authenticated.
 * A 200 with a non-JSON body (proxy/CDN error page, SPA fallback) counts as
 * "no session" instead of crashing the navigation.
 */
export async function fetchMe(): Promise<MeUser | null> {
  const res = await apiFetch("/api/auth/me");
  if (res.status === 200) {
    const user = (await res.json().catch(() => null)) as MeUser | null;
    return user && typeof user === "object" ? user : null;
  }
  if (res.status === 401) return null;
  throw new Error(`auth/me: unexpected status ${String(res.status)}`);
}

async function postJson(
  path: string,
  body: unknown,
): Promise<{ res: Response; data: AuthMessageData }> {
  const res = await apiFetch(path, { method: "POST", body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as AuthMessageData;
  return { res, data };
}

const withStatus = async (path: string, body: unknown) => {
  const { res, data } = await postJson(path, body);
  return { status: res.status, data };
};

const withOk = async (path: string, body: unknown) => {
  const { res, data } = await postJson(path, body);
  return { ok: res.ok, data };
};

export const authApi = {
  login: (email: string, password: string, rememberMe = false) =>
    withStatus("/api/auth/login", { email, password, remember_me: rememberMe }),
  register: (fullName: string, email: string, password: string) =>
    withStatus("/api/auth/register", { full_name: fullName.trim(), email, password }),
  forgotPassword: (email: string) => withOk("/api/auth/forgot-password", { email }),
  resetPassword: (token: string, newPassword: string) =>
    withOk("/api/auth/reset-password", { token, new_password: newPassword }),
  verifyTotpLogin: (ticket: string, code: string) =>
    withOk("/api/auth/totp/verify", { ticket, code: code.trim() }),
  logout: async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // best-effort: aún sin red se limpia el estado local
    }
  },
};
