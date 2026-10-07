import { useTranslation } from "react-i18next";

import { Checkbox } from "@/core/components/ui/checkbox";
import { Label } from "@/core/components/ui/label";

interface RememberCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function RememberCheckbox({ checked, onCheckedChange }: Readonly<RememberCheckboxProps>) {
  const { t } = useTranslation("auth");

  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id="remember-me"
        checked={checked}
        onCheckedChange={(value) => {
          onCheckedChange(value === true);
        }}
      />
      <Label htmlFor="remember-me" className="cursor-pointer font-normal">
        {t("login.remember")}
      </Label>
    </div>
  );
}
