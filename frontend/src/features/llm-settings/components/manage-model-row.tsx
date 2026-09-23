import { Icon } from "@/core/components/icon";

import { formatContextLength } from "../lib/llm-catalog.utils";
import { modelDisplayName } from "../lib/model-name";
import type { CatalogModel } from "../lib/user-llm-settings.types";
import { FlagSwitch } from "./flag-switch";
import { ModelPricingBadge } from "./model-pricing-badge";

interface ManageModelRowProps {
  model: CatalogModel;
  locked: boolean;
  enabled: boolean;
  onToggle: (provider: string, modelId: string) => Promise<void>;
}

export function ManageModelRow({ model, locked, enabled, onToggle }: Readonly<ManageModelRowProps>) {
  const free =
    model.pricing === "Gratuito" ||
    (!model.pricing && (model.provider === "groq" || model.provider === "huggingface"));

  return (
    <div
      className={`flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors [contain-intrinsic-size:auto_3.5rem] [content-visibility:auto] ${locked ? "" : "hover:bg-muted/50"}`}
    >
      <FlagSwitch
        size="sm"
        checked={enabled}
        disabled={locked}
        label={modelDisplayName(model.label, model.model_id)}
        onToggle={() => {
          void onToggle(model.provider, model.model_id);
        }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium text-foreground">
            {modelDisplayName(model.label, model.model_id)}
          </span>
          {locked ? (
            <span
              className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground"
              title="Modelo base del sistema: siempre está activo"
            >
              <Icon name="lock" size="text-xs" />
              <span className="max-sm:sr-only">Modelo base</span>
            </span>
          ) : null}
        </div>
        {model.description ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground" title={model.description}>
            {model.description}
          </p>
        ) : null}
      </div>
      <ModelPricingBadge free={free} variable={model.pricing === "Variable"} pricing={model.pricing} />
      {formatContextLength(model.context_length) ? (
        <span
          className="hidden w-16 shrink-0 text-right text-xs text-muted-foreground tabular-nums sm:inline"
          title="Contexto máximo (tokens)"
        >
          {formatContextLength(model.context_length)}
        </span>
      ) : null}
    </div>
  );
}
