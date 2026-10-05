import type { SyntheticEvent } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("profile");

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.isValid) {
      form.touchAll(event.currentTarget);
      return;
    }
    if (!emailChange.validate()) return;
    const saved = await onSave(emailChange.withPassword());
    if (saved !== null) {
      setPendingEmail(typeof saved.pending_email === "string" ? saved.pending_email : null);
      form.reset(profileToFormValues(saved));
      emailChange.clear();
    }
  };

  return (
    <ProfileSection title={t("form.title")} description={t("form.description")}>
      <form noValidate onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
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
              {t("form.discard")}
            </Button>
          )}
          <Button type="submit" className="max-sm:h-11" loading={isSubmitting}>
            {t("form.save")}
          </Button>
        </div>
      </form>
    </ProfileSection>
  );
}
