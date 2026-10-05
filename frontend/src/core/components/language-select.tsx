import { useTranslation } from "react-i18next";

import { setLanguage } from "@/core/i18n/config";
import {
  isSupportedLanguage,
  LANGUAGE_NAMES,
  normalizeLanguage,
  SUPPORTED_LANGUAGES,
} from "@/core/i18n/languages";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface LanguageSelectProps {
  id?: string;
  className?: string;
}

/** Selector del idioma de la interfaz; recuerda la elección en este navegador. */
export function LanguageSelect({ id = "language", className }: Readonly<LanguageSelectProps>) {
  const { t, i18n } = useTranslation();
  const current = normalizeLanguage(i18n.language) ?? SUPPORTED_LANGUAGES[0];

  return (
    <Select
      value={current}
      onValueChange={(value) => {
        if (isSupportedLanguage(value)) void setLanguage(value);
      }}
    >
      <SelectTrigger id={id} className={className} aria-label={t("language.label")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SUPPORTED_LANGUAGES.map((code) => (
          <SelectItem key={code} value={code} lang={code}>
            {LANGUAGE_NAMES[code]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
