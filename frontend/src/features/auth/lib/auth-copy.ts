import { t } from "i18next";

export const AUTH_LINK_CLASS =
  "rounded-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50";

// Textos como funciones: se resuelven al usarlos, así siguen el idioma activo.
export const backToLogin = () => t("auth:common.backToLogin");
export const connectError = () => t("auth:common.connectError");
export const emailFormatError = () => t("auth:validation.emailFormat");
export const emailValidError = () => t("auth:validation.emailValid");
export const loginFailed = () => t("auth:login.failed");
export const accountDeletedNotice = () => t("auth:login.accountDeleted");
export const sessionExpiredNotice = () => t("auth:login.sessionExpired");
export const tooManyAttempts = () => t("auth:login.tooManyAttempts");
