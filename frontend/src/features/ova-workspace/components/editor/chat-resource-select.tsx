import { useTranslation } from "react-i18next";

import { Button } from "@/core/components/ui/button";

import { resourceLabel } from "../../lib/resource-label";
import type { PhaseWithContent } from "../../lib/types";

interface Props {
  id?: string;
  phases: PhaseWithContent[];
  selected: string[];
  onToggle: (id: string, checked: boolean) => void;
  onSelectAll: () => void;
}

/** Lista de recursos a los que se limitará la instrucción. */
export function ChatResourceSelect({ id, phases, selected, onToggle, onSelectAll }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <fieldset id={id} className="rounded-lg border border-border bg-background p-3">
      <legend className="float-left text-sm font-medium">{t("workspace:recursos_a_regenerar")}</legend>
      <Button variant="link" size="xs" className="float-right h-auto px-0" onClick={onSelectAll}>
        {t("workspace:seleccionar_todos")} </Button>
      <p className="clear-both pt-0.5 text-xs text-muted-foreground">{t("workspace:selectedResourcesHint")}</p>
      <div className="mt-2 max-h-36 space-y-0.5 overflow-y-auto">
        {phases.map((phase) => (
          <label key={phase.id} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-1.5 text-sm hover:bg-muted">
            <input
              type="checkbox"
              className="size-4 shrink-0 accent-primary"
              checked={selected.includes(phase.id)}
              onChange={(event) => {
                onToggle(phase.id, event.target.checked);
              }}
            />
            <span className="min-w-0 truncate">{resourceLabel(phase, t)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
