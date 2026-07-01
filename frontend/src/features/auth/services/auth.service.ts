import { computed, Injectable, inject, signal } from "@angular/core";
import { Router } from "@angular/router";
import { AuthExpiredBus, apiFetch } from "@/core/lib/http";

export interface MeUser {
  id?: string | number;
  role?: string;
  email?: string;
  full_name?: string;
  [key: string]: unknown;
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
    AuthExpiredBus.subscribe(() => this.handleExpired());
  }

  /**
   * Revalidates the session against GET /api/auth/me.
   * Deduplicates concurrent calls via an in-flight promise.
   */
  async revalidate(): Promise<MeUser | null> {
    if (this._inflight) return this._inflight;

    this._loading.set(true);
    this._inflight = (async () => {
      try {
        const res = await apiFetch("/api/auth/me");

        if (res.status === 200) {
          const user = (await res.json()) as MeUser;
          writeCache(user);
          this._user.set(user);
          return user;
        }

        if (res.status === 401) {
          this.handleExpired();
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

  /**
   * Clears session state and redirects to /login.
   */
  logout(): void {
    clearCache();
    this._user.set(null);
    this._inflight = null;
    this.router.navigate(["/login"]);
  }

  private handleExpired(): void {
    clearCache();
    this._user.set(null);
    this._inflight = null;
    this.router.navigate(["/login"], { queryParams: { expired: "1" } });
  }
}
