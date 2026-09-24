import { cn } from "@/core/lib/cn";

import { formatUsd, type ModelFacts, priceSummary } from "../lib/model-facts";

/** Columnas de entrada y salida; gratis, variable o sin dato ocupan las dos. */
export function CatalogPriceCells({ facts }: Readonly<{ facts: ModelFacts }>) {
  if (facts.free || facts.variable || (facts.input === null && facts.output === null)) {
    const label = priceSummary(facts) ?? "Sin dato";
    return (
      <span className="col-span-2 hidden text-right sm:block">
        <span
          className={cn(
            "text-sm",
            facts.free &&
              "rounded-full bg-success/12 px-2 py-0.5 text-xs font-medium text-success-strong",
            !facts.free && "text-muted-foreground",
          )}
        >
          {label}
        </span>
      </span>
    );
  }
  return (
    <>
      <span className="hidden text-right text-sm text-foreground tabular-nums sm:block">
        {facts.input === null ? "?" : formatUsd(facts.input)}
      </span>
      <span className="hidden text-right text-sm text-foreground tabular-nums sm:block">
        {facts.output === null ? "?" : formatUsd(facts.output)}
      </span>
    </>
  );
}
