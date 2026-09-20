import { joinModelValue, splitModelValue } from "../hooks/model-value";
import { useLlmSettings } from "../hooks/use-llm-settings";
import { formatContextLength, PROVIDER_LABELS } from "../lib/llm-catalog.utils";
import { TASK_VISUAL } from "../lib/llm-settings-labels";
import type { CatalogModel } from "../lib/user-llm-settings.types";

interface LlmSettingsFormTaskProps {
  tipo: string;
  locked: boolean;
}

export function LlmSettingsFormTask({ tipo, locked }: Readonly<LlmSettingsFormTaskProps>) {
  const store = useLlmSettings();
  const cur = store.settings?.[tipo] ?? {};
  const vis = TASK_VISUAL[tipo] ?? { icon: "•", bar: "bg-border", tint: "" };
  const current = joinModelValue(cur.provider, cur.model_id);
  const missing = isMissingFromCatalog(tipo, store);

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-border/70 transition-shadow hover:shadow-sm ${vis.tint}`}
    >
      <div className={`absolute inset-y-0 left-0 w-[3px] rounded-l-xl ${vis.bar}`} />
      <div className="space-y-2 py-3 pr-4 pl-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">{vis.icon}</span>
            <span className="text-[10px] font-bold tracking-[.09em] text-muted-foreground uppercase">
              {storeTaskLabel(tipo)}
            </span>
          </div>
          {locked ? null : (
            <button
              type="button"
              onClick={() => {
                store.resetTipo(tipo);
              }}
              disabled={store.saving}
              className="text-[10px] text-muted-foreground transition-colors hover:text-primary disabled:opacity-30"
            >
              Restaurar
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={current}
            disabled={locked}
            aria-label={storeTaskLabel(tipo)}
            onChange={(event) => {
              const next = splitModelValue(event.target.value);
              store.setModel(tipo, next.provider, next.modelId);
            }}
            className="h-8 min-w-0 flex-1 rounded-md border border-border/50 bg-background/70 px-2 text-xs"
          >
            <option value="">Elige un modelo</option>
            {missing ? <option value={current}>{cur.model_id} (actual)</option> : null}
            {Object.keys(store.catalog).map((provider) => (
              <optgroup
                key={provider}
                label={providerGroupLabel(provider, store.catalogStatus?.[provider]?.ok === false)}
              >
                {catalogModels(store.catalog, provider).map((model) => (
                  <option key={model.model_id} value={joinModelValue(provider, model.model_id)}>
                    {optionLabel(model)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <div className="flex shrink-0 items-center gap-1">
            <input
              type="number"
              min={store.bounds[0]}
              max={store.bounds[1]}
              value={cur.timeout_s ?? ""}
              disabled={locked}
              onChange={(event) => {
                store.setTipoTimeout(tipo, Number(event.target.value));
              }}
              className="h-8 w-14 rounded-md border border-border/50 bg-background/70 text-center text-xs"
              title={`Timeout: ${String(store.bounds[0])}–${String(store.bounds[1])} s`}
            />
            <span className="text-[10px] text-muted-foreground">s</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function storeTaskLabel(tipo: string): string {
  const labels: Record<string, string> = {
    texto: "Texto",
    codigo: "Código / HTML interactivo",
    orquestador: "Orquestador",
    razonamiento: "Razonamiento",
  };
  return labels[tipo] ?? tipo;
}

function catalogModels(
  catalog: Record<string, CatalogModel[]>,
  provider: string,
): CatalogModel[] {
  const models = catalog[provider];
  return Array.isArray(models) ? models : [];
}

function isMissingFromCatalog(tipo: string, store: ReturnType<typeof useLlmSettings>): boolean {
  const cur = store.settings?.[tipo];
  if (!cur?.provider || !cur.model_id) return false;
  return !catalogModels(store.catalog, cur.provider).some((model) => model.model_id === cur.model_id);
}

function providerGroupLabel(provider: string, down: boolean): string {
  const label = PROVIDER_LABELS[provider] ?? provider;
  return down ? `${label} · no disponible` : label;
}

function optionLabel(model: CatalogModel): string {
  const name = model.label ?? model.model_id;
  const meta = [model.pricing, formatContextLength(model.context_length ?? 0)]
    .filter(Boolean)
    .join(" · ");
  return meta ? `${name} — ${meta}` : name;
}
