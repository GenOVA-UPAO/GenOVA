import { useTranslation } from "react-i18next";

import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";

import { fieldDescribedBy } from "../../lib/field-described-by";
import type { UserFormErrors, UserFormValues } from "../../lib/user-form";
import { FieldMessage } from "./field-message";

interface EditUserContactFieldsProps {
  values: UserFormValues;
  errors: UserFormErrors;
  disabled: boolean;
  onChange: (field: keyof UserFormValues, value: string) => void;
}

export function EditUserContactFields({
  values,
  errors,
  disabled,
  onChange,
}: Readonly<EditUserContactFieldsProps>) {
  const { t } = useTranslation("admin");
  const phoneHint = t("users.editFields.phoneHint");
  const genderOptions = [
    { value: "masculino", label: t("users.editFields.genderMale") },
    { value: "femenino", label: t("users.editFields.genderFemale") },
    { value: "otro", label: t("users.editFields.genderOther") },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="edit-gender">{t("users.editFields.gender")}</Label>
        <Select
          value={values.gender}
          disabled={disabled}
          onValueChange={(value) => {
            onChange("gender", value);
          }}
        >
          <SelectTrigger id="edit-gender" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            {genderOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-phone">{t("users.editFields.phone")}</Label>
        <Input
          id="edit-phone"
          type="tel"
          autoComplete="off"
          value={values.phone_number}
          disabled={disabled}
          aria-invalid={errors.phone_number !== undefined || undefined}
          aria-describedby={fieldDescribedBy("edit-phone", errors.phone_number, phoneHint)}
          onChange={(event) => {
            onChange("phone_number", event.target.value);
          }}
        />
        <FieldMessage id="edit-phone" error={errors.phone_number} hint={phoneHint} />
      </div>
    </div>
  );
}
