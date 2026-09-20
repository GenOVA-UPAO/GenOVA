import { Icon } from "@/core/components/icon";

import { formatContextLength } from "../lib/llm-catalog.utils";
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
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${locked ? "opacity-60" : "hover:bg-muted/40"}`}
    >
      <FlagSwitch
        size="sm"
        checked={enabled}
        disabled={locked}
        label={model.label ?? model.model_id}
        onToggle={() => {
          void onToggle(model.provider, model.model_id);
        }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-xs font-medium text-foreground">
            {model.label ?? model.model_id}
          </span>
          {locked ? (
            <Icon
              name="lock"
              size="text-[10px]"
              className="shrink-0 text-muted-foreground"
              label="Modelo base del sistema"
            />
          ) : null}
        </div>
        {model.description ? (
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{model.description}</p>
        ) : null}
      </div>
      <ModelPricingBadge free={free} variable={model.pricing === "Variable"} pricing={model.pricing} />
      {formatContextLength(model.context_length) ? (
        <span
          className="shrink-0 text-[10px] text-muted-foreground tabular-nums"
          title="Contexto máximo (tokens)"
        >
          {formatContextLength(model.context_length)}
        </span>
      ) : null}
    </div>
  );
}
