import type { TFunction } from "i18next";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

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

function rangeError(field: ConfigField, raw: string, t: TFunction): string | undefined {
  const value = Number(raw);
  if (raw.trim() !== "" && Number.isInteger(value) && value >= field.min && value <= field.max)
    return undefined;
  return t("workspace:escribe_un_numero_entero_entre_value_y_value", { p0: String(field.min), p1: String(field.max) });
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
  const { t } = useTranslation();
  const fields = getSchema(phase, resourceId, t);
  const [draft, setDraft] = useState(() =>
    toDraft(fields, config ?? getDefaultConfig(phase, resourceId)),
  );
  // Los errores se muestran tras intentar guardar, no mientras se escribe.
  const [tried, setTried] = useState(false);
  const formId = useId();
  const errors = Object.fromEntries(
    fields.map((field) => [
      field.key,
      tried ? rangeError(field, draft[field.key] ?? "", t) : undefined,
    ]),
  );
  const submit = () => {
    const invalid = fields.find((field) => rangeError(field, draft[field.key] ?? "", t));
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
      title={resourceName ? t("workspace:configurar_value", { p0: resourceName }) : t("workspace:configurar_recurso")}
      size="sm"
      description={t("workspace:ajusta_la_extension_y_las_actividades_de_este_recurso")}
      onClose={onClose}
      footer={
        <ModalActions>
          <Button variant="outline" onClick={onClose}>
            {t("workspace:cancelar")} </Button>
          <Button type="submit" form={formId}>
            {t("workspace:guardar_configuracion")} </Button>
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
            {t("workspace:este_recurso_no_tiene_opciones_configurables")} </p>
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
