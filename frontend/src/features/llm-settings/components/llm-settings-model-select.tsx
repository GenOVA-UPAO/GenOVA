import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";

import { joinModelValue, splitModelValue } from "../hooks/model-value";
import { useLlmSettings } from "../hooks/use-llm-settings";
import { formatContextLength, PROVIDER_LABELS } from "../lib/llm-catalog.utils";
import type { CatalogModel } from "../lib/user-llm-settings.types";

interface LlmSettingsModelSelectProps {
  tipo: string;
  label: string;
  locked: boolean;
}

/** Selector de modelo de una tarea, agrupado por proveedor. */
export function LlmSettingsModelSelect({ tipo, label, locked }: Readonly<LlmSettingsModelSelectProps>) {
  const store = useLlmSettings();
  const cur = store.settings?.[tipo] ?? {};
  const current = joinModelValue(cur.provider, cur.model_id);
  const missing = isMissingFromCatalog(store.catalog, cur.provider, cur.model_id);

  return (
    <Select
      value={current === "" ? undefined : current}
      disabled={locked}
      onValueChange={(value) => {
        const next = splitModelValue(value);
        store.setModel(tipo, next.provider, next.modelId);
      }}
    >
      <SelectTrigger aria-label={label} className="h-9 w-full min-w-0 flex-1 max-sm:h-11">
        <SelectValue placeholder="Elige un modelo" />
      </SelectTrigger>
      <SelectContent position="popper" align="start" className="max-h-80">
        {missing ? (
          <SelectItem value={current}>{cur.model_id} (actual)</SelectItem>
        ) : null}
        {Object.keys(store.catalog).map((provider) => (
          <SelectGroup key={provider}>
            <SelectLabel>
              {providerGroupLabel(provider, store.catalogStatus?.[provider]?.ok === false)}
            </SelectLabel>
            {catalogModels(store.catalog, provider).map((model) => (
              <SelectItem key={model.model_id} value={joinModelValue(provider, model.model_id)}>
                <span className="min-w-0 truncate">{model.label ?? model.model_id}</span>
                <span className="shrink-0 text-muted-foreground in-data-[slot=select-trigger]:hidden">
                  {modelMeta(model)}
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

function catalogModels(catalog: Record<string, CatalogModel[]>, provider: string): CatalogModel[] {
  const models = catalog[provider];
  return Array.isArray(models) ? models : [];
}

function isMissingFromCatalog(
  catalog: Record<string, CatalogModel[]>,
  provider: string | undefined,
  modelId: string | undefined,
): boolean {
  if (!provider || !modelId) return false;
  return !catalogModels(catalog, provider).some((model) => model.model_id === modelId);
}

function providerGroupLabel(provider: string, down: boolean): string {
  const label = PROVIDER_LABELS[provider] ?? provider;
  return down ? `${label} (no disponible)` : label;
}

function modelMeta(model: CatalogModel): string {
  return [model.pricing, formatContextLength(model.context_length ?? 0)]
    .filter(Boolean)
    .join(" · ");
}
