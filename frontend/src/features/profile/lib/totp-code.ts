const CODE_ERROR = "Escribe los 6 dígitos que muestra tu app.";

export function totpCodeError(code: string): string {
  if (!/^\d{6}$/.test(code.trim())) return CODE_ERROR;
  return "";
}
