import type { SyntheticEvent } from "react";

import { Button, Spinner } from "@/core/components/ui/button";

import { profileToFormValues } from "../lib/profile-format";
import { profileSchema } from "../lib/profile-schemas";
import type { ProfileData, ProfileFormValues } from "../lib/types";
import { useForm } from "../lib/use-form";
import { ProfileContactFields } from "./profile-contact-fields";
import { ProfileIdentityFields } from "./profile-identity-fields";

interface ProfileFormProps {
  profile: ProfileData | null;
  isSubmitting: boolean;
  onSave: (values: ProfileFormValues) => Promise<boolean>;
}

export function ProfileForm({ profile, isSubmitting, onSave }: Readonly<ProfileFormProps>) {
  const form = useForm(profileSchema, profileToFormValues(profile));

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.isValid) return;
    const saved = await onSave(form.values);
    if (saved) form.reset(profileToFormValues(profile));
  };

  return (
    <div className="glass-card space-y-6 rounded-3xl p-6 sm:p-8">
      <form
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
        className="space-y-6"
      >
        <div className="grid grid-cols-1 gap-6">
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
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => {
              form.reset(profileToFormValues(profile));
            }}
          >
            Restablecer
          </Button>
          <Button type="submit" disabled={isSubmitting || !form.isValid}>
            {isSubmitting && <Spinner />}
            {isSubmitting ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </div>
  );
}
