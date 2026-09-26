import { cn } from "@/core/lib/cn";

import { formatUsd, type ModelFacts, priceSummary } from "../lib/model-facts";

/**
 * Columnas de entrada y salida; gratis, variable, sin dato o el precio de un
 * modelo de imagen o video («$0.04/imagen», «desde $0.03/s») ocupan las dos.
 */
export function CatalogPriceCells({ facts }: Readonly<{ facts: ModelFacts }>) {
  if (spansBothColumns(facts)) {
    return (
      <span className="col-span-2 hidden text-right sm:block">
        <span className={summaryClass(facts)}>{priceSummary(facts) ?? "Sin dato"}</span>
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

/** Un único precio (gratis, variable, de imagen o video) o ninguno: ocupa las dos columnas. */
function spansBothColumns(facts: ModelFacts): boolean {
  if (facts.free || facts.variable || facts.media) return true;
  return facts.input === null && facts.output === null;
}

function summaryClass(facts: ModelFacts): string {
  if (facts.free) {
    return "rounded-full bg-success/12 px-2 py-0.5 text-xs font-medium text-success-strong";
  }
  return cn("text-sm", facts.media ? "text-foreground tabular-nums" : "text-muted-foreground");
}
