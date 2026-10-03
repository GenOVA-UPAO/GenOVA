import type { SyntheticEvent } from "react";
import { useState } from "react";

import { Button } from "@/core/components/ui/button";

import { useEmailChange } from "../hooks/use-email-change";
import { profileToFormValues } from "../lib/profile-format";
import { profileSchema } from "../lib/profile-schemas";
import type { ProfileData, ProfileSaveValues } from "../lib/types";
import { useForm } from "../lib/use-form";
import { EmailChangeFields } from "./email-change-fields";
import { PendingEmailConfirm } from "./pending-email-confirm";
import { ProfileContactFields } from "./profile-contact-fields";
import { ProfileIdentityFields } from "./profile-identity-fields";
import { ProfileSection } from "./profile-section";

interface ProfileFormProps {
  profile: ProfileData | null;
  isSubmitting: boolean;
  onSave: (values: ProfileSaveValues) => Promise<ProfileData | null>;
}

export function ProfileForm({ profile, isSubmitting, onSave }: Readonly<ProfileFormProps>) {
  const form = useForm(profileSchema, profileToFormValues(profile));

  const emailChange = useEmailChange(profile, form.values);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.isValid) {
      form.touchAll(event.currentTarget);
      return;
    }
    if (!emailChange.validate()) return;
    // Se rellena con lo que devolvió el servidor (p. ej. el código ya con ceros):
    // `profile` aún es el de antes de guardar y devolvería los valores viejos.
    const saved = await onSave(emailChange.withPassword());
    if (saved !== null) {
      setPendingEmail(typeof saved.pending_email === "string" ? saved.pending_email : null);
      form.reset(profileToFormValues(saved));
      emailChange.clear();
    }
  };

  return (
    <ProfileSection
      title="Datos personales"
      description="Tu nombre y correo aparecen en los OVAs que creas y en los listados de la plataforma."
    >
      <form
        noValidate
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
        className="space-y-5"
      >
        <ProfileIdentityFields
          values={form.values}
          errorFor={form.errorFor}
          onChange={form.setField}
          onBlur={form.touch}
          disabled={isSubmitting}
        />
        <EmailChangeFields
          emailChange={emailChange}
          totpEnabled={Boolean(profile?.totp_enabled)}
          disabled={isSubmitting}
        />
        {pendingEmail && (
          <PendingEmailConfirm
            pendingEmail={pendingEmail}
            onConfirmed={(email) => {
              form.setField("email", email);
              setPendingEmail(null);
            }}
          />
        )}
        <ProfileContactFields
          values={form.values}
          errorFor={form.errorFor}
          onChange={form.setField}
          onBlur={form.touch}
          disabled={isSubmitting}
        />
        <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
          {form.isDirty && (
            <Button
              type="button"
              variant="ghost"
              className="max-sm:h-11"
              disabled={isSubmitting}
              onClick={() => {
                form.reset(profileToFormValues(profile));
              }}
            >
              Descartar cambios
            </Button>
          )}
          <Button type="submit" className="max-sm:h-11" loading={isSubmitting}>
            Guardar cambios
          </Button>
        </div>
      </form>
    </ProfileSection>
  );
}
