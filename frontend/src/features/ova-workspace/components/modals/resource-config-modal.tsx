import { useId, useState } from "react";

import { Button } from "@/core/components/ui/button";

import { getDefaultConfig, getSchema } from "../../lib/resource-config";
import { WorkspaceModal } from "../shared/workspace-modal";

interface Props {
  phase: string;
  resourceId: string;
  config?: Record<string, number>;
  onSave: (config: Record<string, number>) => void;
  onClose: () => void;
}
export default function ResourceConfigModal({ phase, resourceId, config, onSave, onClose }: Readonly<Props>) {
  const [values, setValues] = useState(config ?? getDefaultConfig(phase, resourceId));
  const formId = useId();
  return (
    <WorkspaceModal title="Configurar recurso" size="sm" description="Ajusta la extensión y las actividades de este recurso." onClose={onClose}
      footer={<Button className="w-full" type="submit" form={formId}>Guardar configuración</Button>}
    >
      <form
        id={formId}
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(values);
          onClose();
        }}
      >
        {getSchema(phase, resourceId).map((field) => (
          <label key={field.key} className="block space-y-2 rounded-xl border bg-muted/20 p-4">
            <span className="text-sm font-medium">{field.label}</span>
            <input
              className="block w-full rounded-md border bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              type="number"
              required
              min={field.min}
              max={field.max}
              aria-describedby={`${formId}-${field.key}`}
              value={values[field.key] ?? field.default}
              onChange={(event) => {
                setValues({ ...values, [field.key]: Number(event.target.value) });
              }}
            />
            <span id={`${formId}-${field.key}`} className="block text-xs leading-relaxed text-muted-foreground">{field.description} · {field.min}–{field.max}</span>
          </label>
        ))}
      </form>
    </WorkspaceModal>
  );
}
