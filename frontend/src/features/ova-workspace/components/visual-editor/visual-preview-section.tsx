import { Icon } from "@/core/components/icon";
import { cn } from "@/core/lib/cn";

import type { VisualSpec } from "../../lib/visual-editor.types";
import { VisualSpecRenderer } from "./visual-spec-renderer";

interface Props {
  spec: VisualSpec | null;
  isApplying: boolean;
  canApply: boolean;
  onApply: () => void;
}

export function VisualPreviewSection({
  spec,
  isApplying,
  canApply,
  onApply,
}: Readonly<Props>) {
  return (
    <div className="flex min-h-0 flex-col space-y-3 lg:col-span-7">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-2">
          <Icon name="eye" className="size-4 text-primary" />
          <h3 className="font-heading text-xs font-bold text-foreground">
            Vista previa del recurso
          </h3>
        </div>

        <button
          type="button"
          onClick={onApply}
          disabled={!canApply || isApplying}
          className={cn(
            "flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-colors",
            "hover:bg-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          {isApplying ? (
            <>
              <Icon name="spinner" className="size-3.5 animate-spin" />
              Guardando versión…
            </>
          ) : (
            <>
              <Icon name="floppy-disk" className="size-3.5" />
              Aplicar como nueva versión
            </>
          )}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <VisualSpecRenderer spec={spec} />
      </div>
    </div>
  );
}
