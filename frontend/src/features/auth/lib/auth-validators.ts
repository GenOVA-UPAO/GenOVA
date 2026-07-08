// Reglas de validación de registro/login compartidas entre el formulario
// (register-page) y los tests unit (cucumber-js importa este módulo puro).
// Espejo del contrato del backend (auth/register_router.py): nombre con al
// menos una letra y contraseña alfanumérica de 8+ caracteres.

export const FULL_NAME_MIN = 3;
export const FULL_NAME_MAX = 100;
export const FULL_NAME_LETTER_RE = /\p{L}/u;
export const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export function isValidFullName(name: string): boolean {
  const trimmed = name.trim();
  return (
    trimmed.length >= FULL_NAME_MIN &&
    trimmed.length <= FULL_NAME_MAX &&
    FULL_NAME_LETTER_RE.test(trimmed)
  );
}

export function isValidPassword(password: string): boolean {
  return PASSWORD_RE.test(password);
}
