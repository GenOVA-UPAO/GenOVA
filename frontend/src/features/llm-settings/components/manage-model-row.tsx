import { PROVIDER_LABELS } from "../lib/llm-catalog.utils";
import { formatContext, type ModelFacts, modelFacts, priceSummary, shortDescription } from "../lib/model-facts";
import { modelDisplayName } from "../lib/model-name";
import { withoutProviderSuffix } from "../lib/model-search";
import { usageSummary } from "../lib/model-usage";
import type { CatalogModel } from "../lib/user-llm-settings.types";
import { CatalogPriceCells } from "./catalog-price-cells";
import { CatalogStarButton } from "./catalog-star-button";
import { ModelCapabilities } from "./model-capabilities";
import { ModelTag } from "./model-tag";

interface ManageModelRowProps {
  model: CatalogModel;
  /** Modelo base del sistema: siempre es favorito. */
  base: boolean;
  favorite: boolean;
  usage: string[];
  onToggle: (provider: string, modelId: string) => Promise<void>;
}

export function ManageModelRow({ model, base, favorite, usage, onToggle }: Readonly<ManageModelRowProps>) {
  const providerLabel = PROVIDER_LABELS[model.provider] ?? model.provider;
  const name = withoutProviderSuffix(modelDisplayName(model.label, model.model_id), providerLabel);
  const facts = modelFacts(model);
  const context = formatContext(facts.context);
  const description = shortDescription(model.description);

  return (
    <li className="grid grid-cols-[auto_1fr] items-start gap-x-3 px-5 py-3 [contain-intrinsic-size:auto_4.5rem] [content-visibility:auto] sm:grid-cols-[auto_1fr_5rem_5rem_4.5rem] sm:items-center">
      <CatalogStarButton name={name} base={base} favorite={favorite} onToggle={() => void onToggle(model.provider, model.model_id)} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="min-w-0 truncate text-sm font-medium text-foreground" title={name}>
            {name}
          </span>
          {base ? <ModelTag>Modelo base</ModelTag> : null}
          {facts.recommended && !base ? <ModelTag>Recomendado</ModelTag> : null}
          {usage.length > 0 ? <ModelTag tone="primary">En uso: {usageSummary(usage)}</ModelTag> : null}
        </div>
        <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span>{providerLabel}</span>
          <ModelCapabilities capabilities={facts.capabilities} />
          <span className="tabular-nums sm:hidden">{mobilePrice(facts)}</span>
          {context ? <span className="tabular-nums sm:hidden">{context} de contexto</span> : null}
        </p>
        {description ? (
          <p lang="en" className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:line-clamp-1" title={model.description ?? undefined}>
            {description}
          </p>
        ) : null}
      </div>
      <CatalogPriceCells facts={facts} />
      <span className="hidden text-right text-sm text-foreground tabular-nums sm:block">{context ?? "Sin dato"}</span>
    </li>
  );
}

function mobilePrice(facts: ModelFacts): string {
  const summary = priceSummary(facts);
  if (!summary) return "Precio sin dato";
  if (facts.free || facts.variable) return summary;
  return `${summary} por 1M tokens`;
}
