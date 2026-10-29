import { useTranslation } from "react-i18next";

import { Input } from "@/core/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";

import { describedBy } from "../lib/described-by";
import type { ProfileFormValues } from "../lib/types";
import { FormField } from "./form-field";

interface ProfileContactFieldsProps {
  values: ProfileFormValues;
  errorFor: (field: keyof ProfileFormValues) => string | undefined;
  onChange: (field: keyof ProfileFormValues, value: string) => void;
  onBlur: (field: keyof ProfileFormValues) => void;
  disabled: boolean;
}

export function ProfileContactFields({
  values,
  errorFor,
  onChange,
  onBlur,
  disabled,
}: Readonly<ProfileContactFieldsProps>) {
  const { t } = useTranslation("profile");
  const phoneError = errorFor("phone_number");
  const phoneHint = t("fields.phoneHint");

  const genderOptions = [
    { value: "masculino", label: t("fields.genderMale") },
    { value: "femenino", label: t("fields.genderFemale") },
    { value: "otro", label: t("fields.genderOther") },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <FormField id="gender" label={t("fields.gender")}>
        <Select
          value={values.gender}
          disabled={disabled}
          onValueChange={(value) => {
            onChange("gender", value);
          }}
        >
          <SelectTrigger id="gender" className="w-full">
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
      </FormField>

      <FormField id="phoneNumber" label={t("fields.phone")} hint={phoneHint} error={phoneError}>
        <Input
          id="phoneNumber"
          type="tel"
          autoComplete="tel"
          value={values.phone_number}
          disabled={disabled}
          aria-invalid={phoneError ? true : undefined}
          aria-describedby={describedBy("phoneNumber", phoneError, phoneHint)}
          onChange={(event) => {
            onChange("phone_number", event.target.value);
          }}
          onBlur={() => {
            onBlur("phone_number");
          }}
        />
      </FormField>
    </div>
  );
}
