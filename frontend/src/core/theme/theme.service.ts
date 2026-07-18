import { computed, effect, Injectable, signal } from "@angular/core";

/** Preferencia explícita del usuario para el chrome de la app. */
export type ThemeMode = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "genova.theme";
const THEME_ORDER: readonly ThemeMode[] = ["light", "dark", "system"];

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isThemeMode(stored) ? stored : "system";
  } catch {
    /* storage unavailable (private mode, permisos, etc.) */
    return "system";
  }
}

function systemPrefersDarkNow(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Dark mode del chrome de GenOVA (G-01). No confundir con el theme del
 * CONTENIDO del OVA (`ThemeSettingsService` / modal "Apariencia" en
 * `ova-theme-modal.component.ts`) — este servicio solo aplica/quita la clase
 * `.dark` en `<html>` según la preferencia del usuario o del sistema.
 *
 * Se registra temprano vía `provideAppInitializer` en `app.config.ts` para
 * aplicar la clase antes del primer paint y evitar flash de tema incorrecto.
 */
@Injectable({ providedIn: "root" })
export class ThemeService {
  private readonly systemPrefersDark = signal(systemPrefersDarkNow());

  /** Preferencia explícita: 'light' | 'dark' | 'system' (default 'system'). */
  readonly theme = signal<ThemeMode>(readStoredTheme());

  /** Tema realmente aplicado, resolviendo 'system' contra prefers-color-scheme. */
  readonly resolvedTheme = computed<ResolvedTheme>(() => {
    const mode = this.theme();
    if (mode === "system") return this.systemPrefersDark() ? "dark" : "light";
    return mode;
  });

  constructor() {
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const onChange = (event: MediaQueryListEvent): void => {
        this.systemPrefersDark.set(event.matches);
      };
      media.addEventListener("change", onChange);
    }

    effect(() => {
      if (typeof document === "undefined") return;
      document.documentElement.classList.toggle("dark", this.resolvedTheme() === "dark");
    });
  }

  /** Fija la preferencia explícita y la persiste en localStorage. */
  setTheme(mode: ThemeMode): void {
    this.theme.set(mode);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* storage unavailable */
    }
  }

  /** Cicla light → dark → system → light… (usado por el toggle del navbar). */
  cycle(): void {
    const idx = THEME_ORDER.indexOf(this.theme());
    this.setTheme(THEME_ORDER[(idx + 1) % THEME_ORDER.length]);
  }
}
