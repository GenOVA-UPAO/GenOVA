import { useState } from "react";

import { authStore } from "@/core/auth/auth-store";
import { Button } from "@/core/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog";

import { saveTheme } from "../../services/theme-settings.service";
import { ThemeDesignPicker } from "./theme-design-picker";
import { ThemeModalPreview } from "./theme-modal-preview";
import { ThemePalettePicker } from "./theme-palette-picker";
import { PALETTES, type ThemeState } from "./theme-types";

interface ThemeModalProps {
  initialTheme?: unknown;
  onClose: () => void;
  onSaved?: (theme: ThemeState) => void;
}

function resolveInitialTheme(initial: unknown): ThemeState {
  if (initial && typeof initial === "object") {
    const raw = initial as Partial<ThemeState>;
    return {
      colorMode: raw.colorMode ?? "upao",
      designMode: raw.designMode ?? "upao",
      palette: raw.palette ?? null,
    };
  }
  return { colorMode: "upao", designMode: "upao", palette: null };
}

/** Recuerda el tema guardado en el usuario en memoria: al reabrir el modal no vuelve al anterior. */
function rememberTheme(theme: ThemeState) {
  const user = authStore.getUser();
  if (user) authStore.setUser({ ...user, theme_settings: theme });
}

/** Foco inicial en la opción marcada (no en la primera, que las flechas cambiarían sin querer). */
function focusCheckedOption(event: Event) {
  const checked = (event.target as HTMLElement).querySelector<HTMLInputElement>("input[type=radio]:checked");
  if (!checked) return;
  event.preventDefault();
  checked.focus();
}

/** Modal «Estilo de mis OVAs»: colores y diseño con los que se generan los OVAs. */
export function ThemeModal({ initialTheme, onClose, onSaved }: Readonly<ThemeModalProps>) {
  const [theme, setTheme] = useState<ThemeState>(() => resolveInitialTheme(initialTheme));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await saveTheme(theme);
      rememberTheme(theme);
      onSaved?.(theme);
      onClose();
    } catch {
      setSaveError("No se pudo guardar el estilo. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const selectColorMode = (mode: string) => {
    // «Personalizado» sin combinación elegida guardaría una paleta vacía.
    setTheme((t) => ({
      ...t,
      colorMode: mode,
      palette: mode === "custom" ? (t.palette ?? PALETTES[1]) : t.palette,
    }));
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogContent
        className="flex max-h-[min(90dvh,48rem)] flex-col gap-0 p-0 sm:max-w-2xl"
        showCloseButton={!saving}
        onOpenAutoFocus={focusCheckedOption}
      >
        <DialogHeader className="border-b border-border px-5 py-4 pr-12">
          <DialogTitle>Estilo de mis OVAs</DialogTitle>
          <DialogDescription>
            Colores y diseño que se usarán al generar tus próximos OVAs.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto px-5 py-5 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <div className="min-w-0 space-y-6">
            <ThemePalettePicker
              colorMode={theme.colorMode}
              selectedPalette={theme.palette}
              onSelectColorMode={selectColorMode}
              onSelectPalette={(pal) => { setTheme((t) => ({ ...t, palette: pal })); }}
            />
            <ThemeDesignPicker
              designMode={theme.designMode}
              onSelectDesignMode={(mode) => { setTheme((t) => ({ ...t, designMode: mode })); }}
            />
          </div>
          <ThemeModalPreview theme={theme} />
        </div>

        <DialogFooter className="mx-0 mb-0 sm:items-center">
          {saveError && (
            <p role="alert" className="text-sm text-destructive sm:mr-auto">
              {saveError}
            </p>
          )}
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button loading={saving} onClick={() => { void handleSave(); }}>
            {saving ? "Guardando..." : "Guardar estilo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
