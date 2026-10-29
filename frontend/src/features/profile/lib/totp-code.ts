import { t } from "i18next";

export function totpCodeError(code: string): string {
  if (!/^\d{6}$/.test(code.trim())) return t("profile:totp.codeInvalid");
  return "";
}
