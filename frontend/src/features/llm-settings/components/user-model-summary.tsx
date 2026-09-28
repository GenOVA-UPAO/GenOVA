import { findModel, type RichModel } from "../lib/model-facts";
import { ModelSummary } from "./model-summary";
import { ModelTestButton } from "./model-test-button";

interface UserModelSummaryProps {
  id: string;
  models: RichModel[];
  provider?: string;
  modelId?: string;
  disabled: boolean;
}

/** Bajo «Tu modelo»: precio y contexto del elegido y «Probar» con tu clave. */
export function UserModelSummary({
  id,
  models,
  provider,
  modelId,
  disabled,
}: Readonly<UserModelSummaryProps>) {
  // El id existe siempre: el selector lo referencia con aria-describedby.
  if (!provider || !modelId) return <span id={id} hidden />;
  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <ModelSummary id={id} variant="compact" model={findModel(models, provider, modelId)} />
      </div>
      <ModelTestButton provider={provider} modelId={modelId} disabled={disabled} />
    </div>
  );
}
