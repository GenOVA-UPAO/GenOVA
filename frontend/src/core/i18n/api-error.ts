import i18n from "i18next";

/**
 * Mensaje traducido para un código de error de la API (`error` en el cuerpo) o,
 * si no hay código conocido, para el estado HTTP. Devuelve `undefined` cuando no
 * hay traducción y debe usarse el `message` del backend como respaldo.
 */
export function apiErrorText(code: string, status: number): string | undefined {
  const byCode = `errors:codes.${code}`;
  if (code !== "" && i18n.exists(byCode)) return i18n.t(byCode);
  const byStatus = `errors:status.${String(status)}`;
  if (status >= 400 && i18n.exists(byStatus)) return i18n.t(byStatus);
  return undefined;
}
