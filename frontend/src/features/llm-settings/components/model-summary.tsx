import { useContext } from "react";

import { LlmSettingsContext } from "../hooks/use-llm-settings";
import type { RichModel } from "../lib/model-facts";
import { providerConnection } from "../lib/provider-connection";
import { ModelSummaryCompact } from "./model-summary-compact";
import { ModelSummaryFull } from "./model-summary-full";

interface ModelSummaryProps {
  id?: string;
  model: RichModel | undefined;
  /** `compact`: una línea bajo un respaldo; `full`: la ficha bajo el modelo principal. */
  variant?: "full" | "compact";
}

/** Lo esencial del modelo elegido, para no tener que abrir la lista para recordarlo. */
export function ModelSummary({ id, model, variant = "full" }: Readonly<ModelSummaryProps>) {
  const store = useContext(LlmSettingsContext);
  if (!model?.provider || !model.model_id) return null;
  const connection = providerConnection(
    store?.catalogStatus,
    store?.ownCatalogStatus,
    model.provider,
  );
  if (variant === "compact")
    return <ModelSummaryCompact id={id} model={model} connection={connection} />;
  return <ModelSummaryFull id={id} model={model} connection={connection} />;
}
