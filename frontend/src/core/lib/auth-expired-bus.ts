/**
 * Simple event bus for 401 session-expired notifications.
 * AuthService subscribes; avoids circular DI.
 *
 * Módulo puro (sin imports de Angular) para que los tests unit (cucumber-js
 * en Node) puedan importarlo directamente; http.ts lo re-exporta.
 */
export const AuthExpiredBus = {
  _listeners: new Set<() => void>(),
  notify() {
    this._listeners.forEach((fn) => {
      fn();
    });
  },
  subscribe(fn: () => void) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  },
};
