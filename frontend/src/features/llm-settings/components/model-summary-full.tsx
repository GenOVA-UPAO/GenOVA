import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { PROVIDER_LABELS } from "../lib/llm-catalog.utils";
import {
  formatContext,
  formatUsd,
  type ModelFacts,
  modelFacts,
  priceDescription,
  priceSummary,
  type RichModel,
} from "../lib/model-facts";
import { CONNECTION_HINTS, type ProviderConnection } from "../lib/provider-connection";
import { ConnectionLabel } from "./connection-label";
import { ModelCapabilities } from "./model-capabilities";
import { ModelFavoriteToggle } from "./model-favorite-toggle";

interface ModelSummaryFullProps {
  id?: string;
  model: RichModel;
  connection: ProviderConnection;
}

/** Ficha bajo el modelo principal: proveedor y su estado, precios, contexto y capacidades. */
export function ModelSummaryFull({ id, model, connection }: Readonly<ModelSummaryFullProps>) {
  const { t } = useTranslation("llm-settings");
  const facts = modelFacts(model);
  const context = formatContext(facts.context);
  const hint = CONNECTION_HINTS[connection];
  const provider = {
    label: t("facts.provider"),
    value: (
      <>
        <span className="mr-1.5">{PROVIDER_LABELS[model.provider] ?? model.provider}</span>
        <ConnectionLabel connection={connection} />
      </>
    ),
  };
  // Imagen y video no cobran por tokens ni tienen contexto: su precio es por
  // imagen o por segundo, y ocupa el hueco de entrada y salida.
  const items: { label: string; value: ReactNode }[] = facts.media
    ? [provider, { label: t("facts.price"), value: mediaValue(facts, t) }]
    : [
        provider,
        { label: t("catalog.input"), value: priceValue(facts, facts.input, t) },
        { label: t("catalog.output"), value: priceValue(facts, facts.output, t) },
        { label: t("catalog.contextColumn"), value: context ? t("facts.tokens", { count: context }) : t("catalog.noData") },
      ];
  return (
    <div id={id} className="space-y-2 rounded-lg bg-muted/50 px-3.5 py-3 dark:bg-muted/30">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{item.label}</dt>
            <dd className="mt-0.5 text-sm font-medium text-foreground tabular-nums">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
      {hint ? <p className="text-xs text-foreground">{hint}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <ModelCapabilities capabilities={facts.capabilities} />
          {facts.media ? null : <span>{t("facts.pricingPerMillionTokens")}</span>}
        </p>
        <ModelFavoriteToggle provider={model.provider} modelId={model.model_id} />
      </div>
    </div>
  );
}

function mediaValue(facts: ModelFacts, t: (key: string, opts?: Record<string, unknown>) => string): ReactNode {
  if (facts.free) return <span className="text-success-strong">{t("catalog.free")}</span>;
  return <span title={priceDescription(facts)}>{priceSummary(facts)}</span>;
}

function priceValue(facts: ModelFacts, value: number | null, t: (key: string, opts?: Record<string, unknown>) => string): ReactNode {
  if (facts.free) return <span className="text-success-strong">{t("catalog.free")}</span>;
  if (facts.variable)
    return <span title={t("facts.variableHint")}>{t("facts.variable")}</span>;
  if (value === null) return <>{t("catalog.noData")}</>;
  return <>{formatUsd(value)}</>;
}

