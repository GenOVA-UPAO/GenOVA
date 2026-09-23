import { useId, useState } from "react";

import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";

import { getDefaultConfig, getSchema } from "../../lib/resource-config";
import { ModalActions } from "../shared/modal-actions";
import { WorkspaceModal } from "../shared/workspace-modal";

interface Props {
  phase: string;
  resourceId: string;
  config?: Record<string, number>;
  /** Nombre visible del recurso para el título. */
  resourceName?: string;
  onSave: (config: Record<string, number>) => void;
  onClose: () => void;
}
export default function ResourceConfigModal({ phase, resourceId, config, resourceName, onSave, onClose }: Readonly<Props>) {
  const [values, setValues] = useState(config ?? getDefaultConfig(phase, resourceId));
  const formId = useId();
  const fields = getSchema(phase, resourceId);
  return (
    <WorkspaceModal
      title={resourceName ? `Configurar ${resourceName}` : "Configurar recurso"}
      size="sm"
      description="Ajusta la extensión y las actividades de este recurso."
      onClose={onClose}
      footer={
        <ModalActions>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form={formId}>Guardar configuración</Button>
        </ModalActions>
      }
    >
      <form
        id={formId}
        className="divide-y divide-border"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(values);
          onClose();
        }}
      >
        {fields.length === 0 && <p className="text-sm text-muted-foreground">Este recurso no tiene opciones configurables.</p>}
        {fields.map((field) => {
          const inputId = `${formId}-${field.key}`;
          return (
            <div key={field.key} className="space-y-1.5 py-3 first:pt-0 last:pb-0">
              <label htmlFor={inputId} className="block text-sm font-medium">{field.label}</label>
              <Input
                id={inputId}
                type="number"
                inputMode="numeric"
                required
                min={field.min}
                max={field.max}
                aria-describedby={`${inputId}-help`}
                className="w-32"
                value={values[field.key] ?? field.default}
                onChange={(event) => {
                  setValues({ ...values, [field.key]: Number(event.target.value) });
                }}
              />
              <p id={`${inputId}-help`} className="text-xs leading-relaxed text-muted-foreground">
                {field.description ? `${field.description}. ` : ""}Entre {field.min} y {field.max}.
              </p>
            </div>
          );
        })}
      </form>
    </WorkspaceModal>
  );
}
