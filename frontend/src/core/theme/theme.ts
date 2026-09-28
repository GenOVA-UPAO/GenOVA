import { useEffect, useSyncExternalStore } from "react";

/** Preferencia explícita del usuario para el chrome de la app (no el tema del OVA). */
export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "genova.theme";
const THEME_ORDER: readonly ThemeMode[] = ["light", "dark", "system"];
const media =
  typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;

function readStored(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" || v === "system" ? v : "system";
  } catch {
    return "system";
  }
}

let mode: ThemeMode = readStored();
const listeners = new Set<() => void>();
const emit = () => {
  listeners.forEach((fn) => {
    fn();
  });
};

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  media?.addEventListener("change", fn);
  return () => {
    listeners.delete(fn);
    media?.removeEventListener("change", fn);
  };
}

export function resolveTheme(m: ThemeMode): "light" | "dark" {
  if (m !== "system") return m;
  return media?.matches ? "dark" : "light";
}

export function setTheme(next: ThemeMode): void {
  mode = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* storage unavailable */
  }
  emit();
}

/** Cicla light → dark → system (toggle del navbar). */
export function cycleTheme(): void {
  setTheme(THEME_ORDER[(THEME_ORDER.indexOf(mode) + 1) % THEME_ORDER.length]);
}

export function useTheme(): { mode: ThemeMode; resolved: "light" | "dark" } {
  const current = useSyncExternalStore(
    subscribe,
    () => mode,
    () => mode,
  );
  const systemDark = useSyncExternalStore(
    subscribe,
    () => Boolean(media?.matches),
    () => false,
  );
  const system = systemDark ? "dark" : "light";
  return { mode: current, resolved: current === "system" ? system : current };
}

/** Keeps `<html class="dark">` in sync (the inline script in index.html sets it pre-paint). */
export function useThemeEffect(): void {
  const { resolved } = useTheme();
  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }, [resolved]);
}
