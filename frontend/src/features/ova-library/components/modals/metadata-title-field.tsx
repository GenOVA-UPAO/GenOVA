import { useTranslation } from "react-i18next";

import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";

interface MetadataTitleFieldProps {
  value: string;
  maxLength: number;
  error: string | null;
  disabled?: boolean;
  onChange: (value: string) => void;
}

/** Campo «Título» con contador y error debajo (enlazados con aria-describedby). */
export function MetadataTitleField({
  value,
  maxLength,
  error,
  disabled = false,
  onChange,
}: Readonly<MetadataTitleFieldProps>) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-2">
      <Label htmlFor="metadata-title">{t("ova-library:titulo")}</Label>
      <Input
        id="metadata-title"
        type="text"
        value={value}
        maxLength={maxLength}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        placeholder={t("ova-library:ej_gestion_de_tablespaces_en_oracle")}
        disabled={disabled}
        required
        aria-invalid={Boolean(error)}
        aria-describedby="metadata-title-hint"
      />
      <div id="metadata-title-hint" className="flex items-start justify-between gap-3 text-xs">
        {error ? (
          <p role="alert" className="font-medium text-destructive">
            {error}
          </p>
        ) : (
          <p className="text-muted-foreground">{t("ova-library:obligatorio")}</p>
        )}
        <p className="shrink-0 text-muted-foreground tabular-nums">
          {value.length}/{maxLength}
        </p>
      </div>
    </div>
  );
}
