import { Icon } from "@/core/components/icon";

import { priceSummary } from "../lib/model-facts";
import type { ModelOption } from "../lib/model-search";

/** Lo que muestra el selector cerrado: favorito, nombre, proveedor y precio. */
export function ModelTriggerValue({ option }: Readonly<{ option: ModelOption | undefined }>) {
  if (!option) return <span className="flex-1 text-muted-foreground">Elige un modelo</span>;
  const price = priceSummary(option.facts);
  return (
    <>
      <span className="flex min-w-0 flex-1 items-center gap-2">
        {option.favorite ? (
          <Icon name="star" weight="fill" size="text-xs" className="shrink-0 text-accent-brand" />
        ) : null}
        <span className="min-w-0 truncate font-medium">{option.name}</span>
        <span className="shrink-0 text-xs text-muted-foreground max-sm:hidden">
          {option.providerLabel}
        </span>
      </span>
      {price ? (
        <span className="hidden shrink-0 text-xs text-muted-foreground tabular-nums sm:inline">
          {price}
        </span>
      ) : null}
    </>
  );
}
