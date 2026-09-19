import { useState } from "react";

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
  return (
    <WorkspaceModal title="Configurar recurso" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(values);
          onClose();
        }}
      >
        {getSchema(phase, resourceId).map((field) => (
          <label key={field.key} className="block">
            {field.label}
            <input
              className="ml-3 rounded border p-2"
              type="number"
              required
              min={field.min}
              max={field.max}
              value={values[field.key] ?? field.default}
              onChange={(event) => {
                setValues({ ...values, [field.key]: Number(event.target.value) });
              }}
            />
            <span className="block text-xs text-muted-foreground">{field.description}</span>
          </label>
        ))}
        <Button type="submit">Guardar configuración</Button>
      </form>
    </WorkspaceModal>
  );
}
