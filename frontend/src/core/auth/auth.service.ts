import { computed, inject, Injectable, signal } from "@angular/core";
import { Router } from "@angular/router";

import { apiFetch, AuthExpiredBus } from "@/core/lib/http";

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

function readCache(): MeUser | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MeUser) : null;
  } catch {
    return null;
  }
}

function writeCache(user: MeUser): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch {
    /* storage unavailable */
  }
}

function clearCache(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * AuthService — Angular equivalent of useCurrentUser + me.ts.
 * Uses Signals for reactive state. Services and guards inject this.
 *
 * Layers: AuthService (state) ← AuthGuard (route) ← Page components (UI)
 */
@Injectable({ providedIn: "root" })
export class AuthService {
  private router = inject(Router);

  // Seed from sessionStorage so there's no flash on reload.
  private _user = signal<MeUser | null>(readCache());
  private _loading = signal<boolean>(false);
  private _inflight: Promise<MeUser | null> | null = null;
  private _lastCheckAt = 0;

  /** Current authenticated user — null if not logged in. */
  readonly user = this._user.asReadonly();

  /** True while a /api/auth/me request is in-flight. */
  readonly loading = this._loading.asReadonly();

  /** True when a user is known (synced with server). */
  readonly isAuthenticated = computed(() => this._user() !== null);

  /** Convenience: current role string. */
  readonly role = computed(() => this._user()?.role ?? null);

  constructor() {
    // Subscribe to 401 expiry bus from http.ts
    AuthExpiredBus.subscribe(() => {
      this.handleExpired();
    });
  }

  /**
   * Revalidates the session against GET /api/auth/me.
   * Deduplicates concurrent calls via an in-flight promise. With `maxAgeMs > 0`
   * a result obtained within that window is reused without hitting the server —
   * guards chained in one navigation (authGuard → redirect → guestGuard) would
   * otherwise fire the same request twice back to back.
   */
  async revalidate(maxAgeMs = 0): Promise<MeUser | null> {
    if (this._inflight) return this._inflight;
    if (maxAgeMs > 0 && Date.now() - this._lastCheckAt < maxAgeMs) return this._user();

    this._loading.set(true);
    this._inflight = (async () => {
      try {
        const res = await apiFetch("/api/auth/me");

        if (res.status === 200) {
          const user = (await res.json()) as MeUser;
          writeCache(user);
          this._user.set(user);
          this._lastCheckAt = Date.now();
          return user;
        }

        if (res.status === 401) {
          // Not authenticated. Clear local state but do NOT navigate here:
          // guards handle redirects. Navigating from revalidate() re-triggers
          // guestGuard on /login → revalidate → 401 → navigate → infinite loop.
          clearCache();
          this._user.set(null);
          this._lastCheckAt = Date.now();
          return null;
        }

        throw new Error(`auth/me: unexpected status ${res.status}`);
      } finally {
        this._loading.set(false);
        this._inflight = null;
      }
    })();

    return this._inflight;
  }

  /**
   * Called after a successful login to seed the user without broadcasting expiry.
   */
  setUser(user: MeUser): void {
    writeCache(user);
    this._user.set(user);
  }

  async login(email: string, password: string): Promise<{ status: number; data: AuthMessageData }> {
    const res = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const data = (await res.json().catch(() => ({}))) as AuthMessageData;
    return { status: res.status, data };
  }

  async register(
    full_name: string,
    email: string,
    password: string,
  ): Promise<{ status: number; data: AuthMessageData }> {
    const res = await apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ full_name: full_name.trim(), email, password }),
    });
    const data = (await res.json().catch(() => ({}))) as AuthMessageData;
    return { status: res.status, data };
  }

  async forgotPassword(email: string): Promise<{ ok: boolean; data: AuthMessageData }> {
    const res = await apiFetch("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    const data = (await res.json().catch(() => ({}))) as AuthMessageData;
    return { ok: res.ok, data };
  }

  async resetPassword(
    token: string,
    new_password: string,
  ): Promise<{ ok: boolean; data: AuthMessageData }> {
    const res = await apiFetch("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, new_password }),
    });
    const data = (await res.json().catch(() => ({}))) as AuthMessageData;
    return { ok: res.ok, data };
  }

  async verifyTotpLogin(
    ticket: string,
    code: string,
  ): Promise<{ ok: boolean; data: AuthMessageData }> {
    const res = await apiFetch("/api/auth/totp/verify", {
      method: "POST",
      body: JSON.stringify({ ticket, code: code.trim() }),
    });
    const data = (await res.json().catch(() => ({}))) as AuthMessageData;
    return { ok: res.ok, data };
  }

  /**
   * Revokes the server session (httpOnly cookie), clears local state and
   * redirects to /login.
   *
   * BU-004: sin la llamada al backend la cookie seguía viva y el guestGuard
   * revalidaba la sesión, rebotando al usuario de vuelta a /dashboard.
   */
  async logout(): Promise<void> {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // best-effort: aún sin red limpiamos el estado local y salimos
    }
    clearCache();
    this._user.set(null);
    this._inflight = null;
    this._lastCheckAt = 0;
    void this.router.navigate(["/login"]);
  }

  private handleExpired(): void {
    clearCache();
    this._user.set(null);
    this._inflight = null;
    this._lastCheckAt = 0;
    void this.router.navigate(["/login"], { queryParams: { expired: "1" } });
  }
}
