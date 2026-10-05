import { toast } from "sonner";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

function copy(label: string, value: string): void {
  navigator.clipboard.writeText(value).then(
    () => toast.success(`${label} copiado`),
    () => toast.error("No se pudo copiar. Selecciona el texto y cópialo a mano."),
  );
}

export function ToolRow({
  label,
  hint,
  value,
}: Readonly<{ label: string; hint: string; value: string }>) {
  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <dt className="text-sm font-medium">{label}</dt>
        <dd className="mt-0.5 text-xs text-muted-foreground">{hint}</dd>
        <dd className="mt-1 font-mono text-sm break-all">{value}</dd>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="max-md:h-11 sm:shrink-0"
        aria-label={`Copiar ${label}`}
        onClick={() => {
          copy(label, value);
        }}
      >
        <Icon name="copy" /> Copiar
      </Button>
    </div>
  );
}
