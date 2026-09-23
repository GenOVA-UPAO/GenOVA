import type { SyntheticEvent } from "react";

import { Button } from "@/core/components/ui/button";

import { profileToFormValues } from "../lib/profile-format";
import { profileSchema } from "../lib/profile-schemas";
import type { ProfileData, ProfileFormValues } from "../lib/types";
import { useForm } from "../lib/use-form";
import { ProfileContactFields } from "./profile-contact-fields";
import { ProfileIdentityFields } from "./profile-identity-fields";
import { ProfileSection } from "./profile-section";

interface ProfileFormProps {
  profile: ProfileData | null;
  isSubmitting: boolean;
  onSave: (values: ProfileFormValues) => Promise<boolean>;
}

export function ProfileForm({ profile, isSubmitting, onSave }: Readonly<ProfileFormProps>) {
  const form = useForm(profileSchema, profileToFormValues(profile));

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.isValid) {
      form.touchAll();
      return;
    }
    const saved = await onSave(form.values);
    if (saved) form.reset(profileToFormValues(profile));
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
        <ProfileContactFields
          values={form.values}
          errorFor={form.errorFor}
          onChange={form.setField}
          onBlur={form.touch}
          disabled={isSubmitting}
        />
        <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
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
          <Button type="submit" className="max-sm:h-11" loading={isSubmitting}>
            Guardar cambios
          </Button>
        </div>
      </form>
    </ProfileSection>
  );
}
