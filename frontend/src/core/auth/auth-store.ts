import { useSyncExternalStore } from "react";

import { AuthExpiredBus } from "@/core/lib/auth-expired-bus";

import {
  authApi,
  clearCachedUser,
  fetchMe,
  type MeUser,
  readCachedUser,
  writeCachedUser,
} from "./auth.service";

type Listener = () => void;

/**
 * Session state shared by route loaders (guards) and components.
 * Seeded from sessionStorage so a reload renders without a flash.
 */
class AuthStore {
  private user: MeUser | null = readCachedUser();
  private inflight: Promise<MeUser | null> | null = null;
  private lastCheckAt = 0;
  private listeners = new Set<Listener>();
  /** Set by the router shell; called when the backend reports an expired session. */
  onExpired: (() => void) | null = null;

  constructor() {
    AuthExpiredBus.subscribe(() => {
      this.reset();
      this.onExpired?.();
    });
  }

  subscribe = (fn: Listener): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getUser = (): MeUser | null => this.user;

  private emit(): void {
    this.listeners.forEach((fn) => {
      fn();
    });
  }

  setUser(user: MeUser | null): void {
    if (user) writeCachedUser(user);
    else clearCachedUser();
    this.user = user;
    this.emit();
  }

  /**
   * Revalidates against /api/auth/me, deduplicating concurrent calls. Within
   * `maxAgeMs` the last result is reused: chained guards in one navigation
   * (protected → /login → guest) would otherwise fire the request twice.
   */
  revalidate(maxAgeMs = 0): Promise<MeUser | null> {
    if (this.inflight) return this.inflight;
    if (maxAgeMs > 0 && Date.now() - this.lastCheckAt < maxAgeMs) {
      return Promise.resolve(this.user);
    }
    this.inflight = fetchMe()
      .then((user) => {
        this.lastCheckAt = Date.now();
        this.setUser(user);
        return user;
      })
      .finally(() => {
        this.inflight = null;
      });
    return this.inflight;
  }

  private reset(): void {
    this.inflight = null;
    this.lastCheckAt = 0;
    this.setUser(null);
  }

  /** Revokes the server session (httpOnly cookie) and clears local state. */
  async logout(): Promise<void> {
    await authApi.logout();
    this.reset();
  }
}

export const authStore = new AuthStore();

export function useCurrentUser(): MeUser | null {
  return useSyncExternalStore(authStore.subscribe, authStore.getUser, authStore.getUser);
}

export function useIsAdmin(): boolean {
  return useCurrentUser()?.role === "administrador";
}
