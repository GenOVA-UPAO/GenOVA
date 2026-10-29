import { useTranslation } from "react-i18next";

import { Icon } from "@/core/components/icon";

import {
  formatContext,
  formatUsd,
  type ModelFacts,
  modelFacts,
  priceDescription,
  type RichModel,
} from "../lib/model-facts";
import {
  CONNECTION_HINTS,
  CONNECTION_LABELS,
  type ProviderConnection,
} from "../lib/provider-connection";
import { ModelCapabilities } from "./model-capabilities";

interface ModelSummaryCompactProps {
  id?: string;
  model: RichModel;
  connection: ProviderConnection;
}

/** Una línea bajo un respaldo: precio, contexto, capacidades y aviso si el proveedor falla. */
export function ModelSummaryCompact({ id, model, connection }: Readonly<ModelSummaryCompactProps>) {
  const { t } = useTranslation("llm-settings");
  const facts = modelFacts(model);
  const context = formatContext(facts.context);
  const price = compactPrice(facts, t);
  const problem = connection === "unconnected" || connection === "down" || connection === "invalid";
  return (
    <p id={id} className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
      {price ? <span className="tabular-nums">{price}</span> : null}
      {context ? <span className="tabular-nums">{context} {t("catalog.ofContext")}</span> : null}
      <ModelCapabilities capabilities={facts.capabilities} />
      {problem ? (
        <span
          className="inline-flex items-center gap-1 text-accent-brand"
          title={CONNECTION_HINTS[connection]}
        >
          <Icon name="warning" size="text-xs" />
          {connection === "invalid"
            ? CONNECTION_LABELS.invalid
            : t("facts.providerStatus", { status: CONNECTION_LABELS[connection].toLowerCase() })}
        </span>
      ) : null}
    </p>
  );
}

function compactPrice(facts: ModelFacts, t: (key: string, opts?: Record<string, unknown>) => string): string | null {
  if (facts.free) return t("catalog.free");
  if (facts.media) return priceDescription(facts);
  if (facts.variable) return t("facts.variablePrice");
  if (facts.input === null || facts.output === null) return null;
  return t("facts.compactPriceFormat", { input: formatUsd(facts.input), output: formatUsd(facts.output) });
}

