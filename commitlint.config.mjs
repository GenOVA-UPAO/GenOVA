/**
 * Conventional Commits. Asunto en español permitido (config-conventional no
 * fuerza idioma, solo formato `tipo(scope): asunto`). Se relajan los límites de
 * longitud de cuerpo/footer porque el historial del repo usa cuerpos largos.
 */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "body-max-line-length": [0, "always", Infinity],
    "footer-max-line-length": [0, "always", Infinity],
  },
};
