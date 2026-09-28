import { useSyncExternalStore } from "react";

/**
 * Estado plegado del menú lateral, compartido entre el botón de la barra superior
 * y el propio menú. Hay dos preferencias: la general y la de pantallas completas
 * (workspace, crear), que por defecto se pliega para dejar sitio al editor.
 */
export type SidebarScope = "default" | "fullBleed";

const KEYS: Record<SidebarScope, string> = {
  default: "genova_sidebar_collapsed",
  fullBleed: "genova_sidebar_collapsed_fullbleed",
};
const DEFAULTS: Record<SidebarScope, boolean> = { default: false, fullBleed: true };

function read(scope: SidebarScope): boolean {
  try {
    const v = localStorage.getItem(KEYS[scope]);
    return v === null ? DEFAULTS[scope] : v === "1";
  } catch {
    return DEFAULTS[scope];
  }
}

const state: Record<SidebarScope, boolean> = { default: read("default"), fullBleed: read("fullBleed") };
const listeners = new Set<() => void>();

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function toggleSidebar(scope: SidebarScope): void {
  state[scope] = !state[scope];
  try {
    localStorage.setItem(KEYS[scope], state[scope] ? "1" : "0");
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((fn) => {
    fn();
  });
}

export function useSidebarCollapsed(scope: SidebarScope): boolean {
  return useSyncExternalStore(
    subscribe,
    () => state[scope],
    () => DEFAULTS[scope],
  );
}
