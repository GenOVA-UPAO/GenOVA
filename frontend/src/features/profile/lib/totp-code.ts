const CODE_ERROR = "Ingresa el código de 6 dígitos.";

export function totpCodeError(code: string): string {
  if (code.length < 6 || code.length > 8) return CODE_ERROR;
  return "";
}
