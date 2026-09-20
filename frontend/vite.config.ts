import path from "node:path";

import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

/**
 * GENOVA_API_BASE_* se inyectan como globales en build/serve (antes lo hacía
 * scripts/run-with-api-env.mjs con `ng --define`). Se leen de process.env y de
 * .env / .env.local / .env.production; GENOVA_API_BASE_URL sobrescribe ambos.
 */
function apiBases(mode: string): { prod: string; develop: string } {
  const env = { ...loadEnv(mode, import.meta.dirname, "GENOVA_"), ...process.env };
  const pick = (...keys: string[]) => keys.map((k) => env[k]?.trim()).find(Boolean) ?? "";
  const single = pick("GENOVA_API_BASE_URL");
  const prod = single || pick("GENOVA_API_BASE_PROD");
  const develop = single || pick("GENOVA_API_BASE_DEVELOP") || prod;
  return { prod, develop };
}

// Destino del proxy en desarrollo. GENOVA_DEV_BACKEND permite levantar una
// segunda instancia contra el backend determinista (LLM_FAKE=1) y probar la
// generación de OVAs sin gastar créditos de un proveedor real.
const BACKEND = process.env.GENOVA_DEV_BACKEND ?? "http://127.0.0.1:8000";

// Phosphor y radix quedan FUERA del splitting manual: forzarlos a un chunk único
// hacía que el entry lo descargue entero aunque la ruta solo use 3-4 módulos;
// Rolldown los reparte por grafo y cada ruta baja solo lo que usa.
const VENDOR_CHUNKS: [string[], string][] = [
  [["@sentry"], "vendor-sentry"],
  [["driver.js"], "vendor-tour"],
  [["react-router"], "vendor-router"],
  [["@tanstack"], "vendor-query"],
  // "/react/" a secas coincide con `@phosphor-icons/react/dist/...`: hay que
  // acotar al segmento node_modules/<pkg>/ para no arrastrar iconos aquí.
  [["/node_modules/react/", "/node_modules/react-dom/", "/node_modules/scheduler/"], "vendor-react"],
];

export default defineConfig(({ mode }) => {
  const { prod, develop } = apiBases(mode);
  return {
    plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
    resolve: {
      alias: { "@": path.resolve(import.meta.dirname, "./src") },
    },
    define: {
      GENOVA_API_BASE_PROD: JSON.stringify(prod),
      GENOVA_API_BASE_DEVELOP: JSON.stringify(develop),
    },
    server: {
      port: 4200,
      strictPort: true,
      proxy: {
        "/api": { target: BACKEND, changeOrigin: true, cookieDomainRewrite: "localhost" },
        "/auth": { target: BACKEND, changeOrigin: true, cookieDomainRewrite: "localhost" },
      },
      fs: {
        // pnpm hoists deps to the monorepo root; the dev server (rooted at
        // frontend/) must be allowed to serve e.g. fontsource woff2 from there.
        allow: [path.resolve(import.meta.dirname, "..")],
      },
    },
    preview: { port: 4200 },
    build: {
      target: "es2022",
      sourcemap: false,
      rollupOptions: {
        output: {
          // Stable vendor chunks: app deploys don't bust the long-lived cache of
          // React/router/query. Order matters — pnpm paths embed peer versions
          // (e.g. `@tanstack+react-query@..._react@19`), so libs go before React.
          manualChunks(id: string) {
            if (!id.includes("node_modules")) return undefined;
            return VENDOR_CHUNKS.find(([needles]) => needles.some((n) => id.includes(n)))?.[1];
          },
        },
      },
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test-setup.ts"],
      include: ["src/**/*.spec.{ts,tsx}"],
      css: false,
    },
  };
});
