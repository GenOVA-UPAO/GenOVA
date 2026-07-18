/**
 * Lee GENOVA_API_BASE_* desde .env / process.env y lanza ng con --define
 * para que las URLs no vivan en el codigo fuente.
 *
 * Uso: node scripts/run-with-api-env.mjs <serve|build|...> [...args]
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  /** @type {Record<string, string>} */
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const fileEnv = {
  ...parseEnvFile(resolve(root, ".env")),
  ...parseEnvFile(resolve(root, ".env.local")),
  ...parseEnvFile(resolve(root, ".env.production")),
};

function pick(...keys) {
  for (const key of keys) {
    const fromProcess = process.env[key]?.trim();
    if (fromProcess) return fromProcess;
    const fromFile = fileEnv[key]?.trim();
    if (fromFile) return fromFile;
  }
  return "";
}

const single = pick("GENOVA_API_BASE_URL", "NG_APP_API_BASE_URL");
const prod = single || pick("GENOVA_API_BASE_PROD", "NG_APP_API_BASE_PROD");
const develop =
  single || pick("GENOVA_API_BASE_DEVELOP", "NG_APP_API_BASE_DEVELOP") || prod;

/** Angular --define: el valor debe ser un literal JS (p. ej. '"https://..."'). */
function defineArg(name, value) {
  return `${name}=${JSON.stringify(value)}`;
}

const ngArgs = process.argv.slice(2);
if (ngArgs.length === 0) {
  console.error("Uso: node scripts/run-with-api-env.mjs <comando-ng> [...args]");
  process.exit(1);
}

const ngCli = resolve(root, "node_modules/@angular/cli/bin/ng.js");
const args = [
  ngCli,
  ...ngArgs,
  "--define",
  defineArg("GENOVA_API_BASE_PROD", prod),
  "--define",
  defineArg("GENOVA_API_BASE_DEVELOP", develop),
];

console.log(
  `[api-env] prod=${prod ? "set" : "empty"} develop=${develop ? "set" : "empty"}`,
);

const result = spawnSync(process.execPath, args, {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
