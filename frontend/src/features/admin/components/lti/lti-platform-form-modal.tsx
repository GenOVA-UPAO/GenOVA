import { type SyntheticEvent, useState } from "react";

import { Button } from "@/core/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog";
import { Label } from "@/core/components/ui/label";
import { Switch } from "@/core/components/ui/switch";

import type { LtiPlatform, LtiPlatformPayload } from "../../api/admin-lti.api";
import { LTI_FIELDS } from "../../lib/lti-platform-fields";
import {
  emptyLtiForm,
  formFromPlatform,
  type LtiPlatformErrors,
  type LtiPlatformField,
  toLtiPayload,
  validateLtiForm,
} from "../../lib/lti-platform-form";
import { FormErrorAlert } from "../form-error-alert";
import { LtiPlatformFieldInput } from "./lti-platform-fields";

interface LtiPlatformFormModalProps {
  platform: LtiPlatform | null;
  isSubmitting: boolean;
  serverError: string;
  onSubmit: (payload: LtiPlatformPayload) => void;
  onClose: () => void;
}

function submitLabel(isEdit: boolean, isSubmitting: boolean): string {
  if (isSubmitting) return "Guardando…";
  return isEdit ? "Guardar cambios" : "Registrar plataforma";
}

export function LtiPlatformFormModal({
  platform,
  isSubmitting,
  serverError,
  onSubmit,
  onClose,
}: Readonly<LtiPlatformFormModalProps>) {
  const [form, setForm] = useState(() =>
    platform === null ? emptyLtiForm() : formFromPlatform(platform),
  );
  const [errors, setErrors] = useState<LtiPlatformErrors>({});

  const handleChange = (field: LtiPlatformField, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field] !== undefined) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validateLtiForm(form);
    setErrors(found);
    const first = LTI_FIELDS.find((spec) => found[spec.field] !== undefined);
    if (first !== undefined) {
      document.getElementById(`lti-${first.field}`)?.focus();
      return;
    }
    onSubmit(toLtiPayload(form));
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose();
      }}
    >
      <DialogContent className="max-h-[92dvh] overflow-y-auto overscroll-contain sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {platform === null ? "Registrar plataforma LTI" : `Editar «${platform.name}»`}
          </DialogTitle>
          <DialogDescription>
            Copia estos datos de la configuración de la herramienta en tu LMS.
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={handleSubmit} className="space-y-4">
          {LTI_FIELDS.map((spec) => (
            <LtiPlatformFieldInput
              key={spec.field}
              spec={spec}
              form={form}
              errors={errors}
              disabled={isSubmitting}
              onChange={handleChange}
            />
          ))}
          <div className="flex items-center gap-3">
            <Switch
              id="lti-is-active"
              checked={form.is_active}
              disabled={isSubmitting}
              onCheckedChange={(checked) => {
                setForm((current) => ({ ...current, is_active: checked }));
              }}
            />
            <Label htmlFor="lti-is-active">Activa (acepta lanzamientos desde este LMS)</Label>
          </div>
          <FormErrorAlert message={serverError} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {submitLabel(platform !== null, isSubmitting)}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
