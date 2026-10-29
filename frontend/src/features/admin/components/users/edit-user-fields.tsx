import { useTranslation } from "react-i18next";

import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";

import { fieldDescribedBy } from "../../lib/field-described-by";
import type { UserFormErrors, UserFormValues } from "../../lib/user-form";
import { FieldMessage } from "./field-message";

interface EditUserFieldsProps {
  values: UserFormValues;
  errors: UserFormErrors;
  disabled: boolean;
  onChange: (field: keyof UserFormValues, value: string) => void;
}

export function EditUserFields({
  values,
  errors,
  disabled,
  onChange,
}: Readonly<EditUserFieldsProps>) {
  const { t } = useTranslation("admin");
  const uniHint = t("users.editFields.universityIdHint");

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="edit-full-name">{t("users.editFields.fullName")}</Label>
        <Input
          id="edit-full-name"
          type="text"
          autoComplete="off"
          value={values.full_name}
          disabled={disabled}
          aria-invalid={errors.full_name !== undefined || undefined}
          aria-describedby={fieldDescribedBy("edit-full-name", errors.full_name)}
          onChange={(event) => {
            onChange("full_name", event.target.value);
          }}
        />
        <FieldMessage id="edit-full-name" error={errors.full_name} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-email">{t("users.editFields.email")}</Label>
        <Input
          id="edit-email"
          type="email"
          autoComplete="off"
          spellCheck={false}
          value={values.email}
          disabled={disabled}
          aria-invalid={errors.email !== undefined || undefined}
          aria-describedby={fieldDescribedBy("edit-email", errors.email)}
          onChange={(event) => {
            onChange("email", event.target.value);
          }}
        />
        <FieldMessage id="edit-email" error={errors.email} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-uni-id">{t("users.editFields.universityId")}</Label>
        <Input
          id="edit-uni-id"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          aria-invalid={errors.university_id !== undefined || undefined}
          aria-describedby={fieldDescribedBy("edit-uni-id", errors.university_id, uniHint)}
          value={values.university_id}
          disabled={disabled}
          onChange={(event) => {
            onChange("university_id", event.target.value);
          }}
        />
        <FieldMessage id="edit-uni-id" error={errors.university_id} hint={uniHint} />
      </div>
    </>
  );
}
