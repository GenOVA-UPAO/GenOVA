import { useState } from "react";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import { Dialog, DialogContent } from "@/core/components/ui/dialog";

import { saveTheme } from "../../services/theme-settings.service";
import { ThemeDesignPicker } from "./theme-design-picker";
import { ThemeModalPreview } from "./theme-modal-preview";
import { ThemePalettePicker } from "./theme-palette-picker";
import type { ThemeState } from "./theme-types";

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

/** Modal de configuración de tema y apariencia de las OVAs. */
export function ThemeModal({
  initialTheme,
  onClose,
  onSaved,
}: Readonly<ThemeModalProps>) {
  const [theme, setTheme] = useState<ThemeState>(() => resolveInitialTheme(initialTheme));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await saveTheme(theme);
      onSaved?.(theme);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo guardar el tema.";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-2xl" showCloseButton={false}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-lg font-semibold">Configuración de Diseño y Tema</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="cursor-pointer rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
          >
            <Icon name="x" size="text-xl" />
          </button>
        </div>

        <div className="max-h-[72vh] overflow-y-auto">
          <div className="flex flex-col gap-4 p-5 sm:flex-row">
            <div className="min-w-0 flex-1 space-y-5">
              <ThemePalettePicker
                colorMode={theme.colorMode}
                selectedPalette={theme.palette}
                onSelectColorMode={(mode) => { setTheme((t) => ({ ...t, colorMode: mode })); }}
                onSelectPalette={(pal) => { setTheme((t) => ({ ...t, palette: pal })); }}
              />

              <ThemeDesignPicker
                designMode={theme.designMode}
                onSelectDesignMode={(mode) => { setTheme((t) => ({ ...t, designMode: mode })); }}
              />
            </div>

            <ThemeModalPreview theme={theme} />
          </div>

          <div className="space-y-2 border-t border-border px-5 py-4">
            {saveError && <p className="text-center text-xs text-destructive">{saveError}</p>}
            <Button
              type="button"
              className="w-full py-2.5 font-semibold"
              disabled={saving}
              loading={saving}
              onClick={() => { void handleSave(); }}
            >
              {saving ? "Guardando..." : "Aplicar tema"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
