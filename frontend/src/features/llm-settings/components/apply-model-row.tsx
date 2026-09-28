import { Checkbox } from "@/core/components/ui/checkbox";

import type { ApplyPreview } from "../lib/bulk-apply";
import type { Entry } from "../lib/llm-config-draft";
import { taskMeta } from "../lib/task-meta";

interface ApplyRowProps {
  item: ApplyPreview;
  checked: boolean;
  withFallbacks: boolean;
  name: (entry: Entry) => string;
  onToggle: (checked: boolean) => void;
}

/** Una tarea destino: casilla, nombre y qué modelo tiene ahora. */
export function ApplyModelRow({
  item,
  checked,
  withFallbacks,
  name,
  onToggle,
}: Readonly<ApplyRowProps>) {
  const id = `apply-${item.task}`;
  const fallbacksChange = withFallbacks && !item.unchanged;
  return (
    <li className="flex items-start gap-3 px-3.5 py-3">
      <Checkbox
        id={id}
        className="mt-0.5"
        checked={checked && !item.unchanged}
        disabled={item.unchanged}
        onCheckedChange={(value) => {
          onToggle(value === true);
        }}
      />
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer text-sm">
        <span className="font-medium">{taskMeta(item.task).label}</span>
        {item.unchanged ? (
          <span className="block text-xs text-muted-foreground">
            {withFallbacks ? "Ya usa este modelo y estos respaldos." : "Ya usa este modelo."}
          </span>
        ) : (
          <span className="block text-xs text-muted-foreground">
            Ahora: {name(item.from)}
            {fallbacksChange ? `. Respaldos: ${listOrNone(item.fallbacksFrom, name)}` : ""}
          </span>
        )}
      </label>
    </li>
  );
}

function listOrNone(entries: Entry[], name: (entry: Entry) => string): string {
  return entries.length > 0 ? entries.map(name).join(", ") : "ninguno";
}
