import path from "node:path";

/**
 * Solo se procesa el frontend en pre-commit (decisión del proyecto: los checks
 * de backend van en pre-push). ESLint del frontend usa config plana con
 * `tsconfigRootDir` relativo, así que hay que ejecutarlo con cwd = frontend/:
 * `pnpm --filter frontend exec` lo garantiza. Las rutas se pasan relativas a
 * frontend/.
 */
const toFrontendRel = (files) =>
  files.map((f) => JSON.stringify(path.relative("frontend", f))).join(" ");

export default {
  "frontend/**/*.{ts,html}": (files) => [
    `pnpm --filter frontend exec eslint --fix --no-warn-ignored ${toFrontendRel(files)}`,
  ],
  "frontend/**/*.{css,json,md,yml,yaml}": (files) => [
    `pnpm --filter frontend exec prettier --write ${toFrontendRel(files)}`,
  ],
};
