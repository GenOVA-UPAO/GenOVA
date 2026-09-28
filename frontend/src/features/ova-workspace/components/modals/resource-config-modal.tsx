import { useId, useState } from "react";

import { Button } from "@/core/components/ui/button";

import { type ConfigField, getDefaultConfig, getSchema } from "../../lib/resource-config";
import { ModalActions } from "../shared/modal-actions";
import { WorkspaceModal } from "../shared/workspace-modal";
import { ResourceConfigField } from "./resource-config-field";

interface Props {
  phase: string;
  resourceId: string;
  config?: Record<string, number>;
  /** Nombre visible del recurso para el título. */
  resourceName?: string;
  onSave: (config: Record<string, number>) => void;
  onClose: () => void;
}

function rangeError(field: ConfigField, raw: string): string | undefined {
  const value = Number(raw);
  if (raw.trim() !== "" && Number.isInteger(value) && value >= field.min && value <= field.max)
    return undefined;
  return `Escribe un número entero entre ${String(field.min)} y ${String(field.max)}.`;
}

function toDraft(fields: ConfigField[], config: Record<string, number>): Record<string, string> {
  return Object.fromEntries(
    fields.map((field) => [field.key, String(config[field.key] ?? field.default)]),
  );
}

export default function ResourceConfigModal({
  phase,
  resourceId,
  config,
  resourceName,
  onSave,
  onClose,
}: Readonly<Props>) {
  const fields = getSchema(phase, resourceId);
  const [draft, setDraft] = useState(() =>
    toDraft(fields, config ?? getDefaultConfig(phase, resourceId)),
  );
  // Los errores se muestran tras intentar guardar, no mientras se escribe.
  const [tried, setTried] = useState(false);
  const formId = useId();
  const errors = Object.fromEntries(
    fields.map((field) => [
      field.key,
      tried ? rangeError(field, draft[field.key] ?? "") : undefined,
    ]),
  );
  const submit = () => {
    const invalid = fields.find((field) => rangeError(field, draft[field.key] ?? ""));
    if (invalid) {
      setTried(true);
      document.getElementById(`${formId}-${invalid.key}`)?.focus();
      return;
    }
    onSave(Object.fromEntries(fields.map((field) => [field.key, Number(draft[field.key])])));
    onClose();
  };
  return (
    <WorkspaceModal
      title={resourceName ? `Configurar ${resourceName}` : "Configurar recurso"}
      size="sm"
      description="Ajusta la extensión y las actividades de este recurso."
      onClose={onClose}
      footer={
        <ModalActions>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={formId}>
            Guardar configuración
          </Button>
        </ModalActions>
      }
    >
      <form
        id={formId}
        noValidate
        className="divide-y divide-border"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Este recurso no tiene opciones configurables.
          </p>
        )}
        {fields.map((field) => (
          <ResourceConfigField
            key={field.key}
            id={`${formId}-${field.key}`}
            field={field}
            value={draft[field.key] ?? ""}
            error={errors[field.key]}
            onChange={(value) => {
              setDraft({ ...draft, [field.key]: value });
            }}
          />
        ))}
      </form>
    </WorkspaceModal>
  );
}
