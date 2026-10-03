import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";

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

/**
 * Preload de la fuente display (Fraunces) en el HTML: el navegador solo la
 * descubre tras el CSS y el elemento LCP es el h1 `font-display`. El nombre
 * lleva hash, así que se copia desde dist/assets en el cierre del build.
 * Geist NO se preloadea: llega a t≈300 ms vía CSS y preloadear ambas fuentes
 * roba ancho de banda al JS crítico sin adelantar el LCP (probado y
 * descartado; con font-display: swap el texto pinta antes con fallback).
 */
function preloadDisplayFont(): Plugin {
  return {
    name: "preload-display-font",
    apply: "build",
    writeBundle() {
      const assetsDir = path.resolve(import.meta.dirname, "./dist/assets");
      const fonts = readdirSync(assetsDir).filter((f) => f.startsWith("fraunces-latin-wght"));
      const links = fonts
        .slice(0, 1)
        .map(
          (font) =>
            `    <link rel="preload" href="/assets/${font}" as="font" type="font/woff2" crossorigin />`,
        );
      if (links.length === 0) return;
      const htmlPath = path.resolve(import.meta.dirname, "./dist/index.html");
      const html = readFileSync(htmlPath, "utf8");
      if (html.includes(fonts[0])) return;
      writeFileSync(htmlPath, html.replace("</title>", "</title>\n" + links.join("\n")));
    },
  };
}

/** Chunk de página por prefijo de ruta (routes de src/app/router.tsx). */
const AUTH = "app-layout";
const ROUTE_PAGES: [string, string[]][] = [
  ["/login", ["login-page"]],
  ["/register", ["register-page"]],
  ["/forgot-password", ["forgot-password-page"]],
  ["/reset-password", ["reset-password-page"]],
  ["/verify-email", ["verify-email-page"]],
  ["/", [AUTH, "dashboard-page"]],
  ["/dashboard", [AUTH, "dashboard-page"]],
  ["/mis-ovas", [AUTH, "mis-ovas-page"]],
  ["/papelera", [AUTH, "papelera-page"]],
  ["/crear", [AUTH, "ova-workspace-page"]],
  ["/workspace", [AUTH, "ova-workspace-page"]],
  ["/profile", [AUTH, "profile-page"]],
  ["/analytics", [AUTH, "analytics-page"]],
  ["/models", [AUTH, "models-page"]],
  ["/admin/roles", [AUTH, "admin-roles-page"]],
  ["/admin", [AUTH, "admin-users-page"]],
  ["/explore", ["explore-page"]],
  ["/engage", ["engage-page"]],
];

const ALWAYS_PRELOADED = /^(vendor-|index-|rolldown-runtime-|http-)/;

/**
 * Los chunks de la ruta se descubren tras ejecutar el entry (import dinámico
 * del router): una "ola" entera de latencia en redes lentas. Este plugin lee
 * el grafo de imports del build y genera un mapa ruta→chunks que un script
 * inline convierte en <link rel=modulepreload> según location.pathname:
 * cada ruta solo adelanta SU critical path, nada global.
 */
function preloadRouteChunks(): Plugin {
  return {
    name: "preload-route-chunks",
    apply: "build",
    writeBundle() {
      const assetsDir = path.resolve(import.meta.dirname, "./dist/assets");
      const assets = readdirSync(assetsDir).filter((f) => f.endsWith(".js"));
      const pages = new Map<string, string>();
      for (const file of assets) {
        const page = ROUTE_PAGES.flatMap(([, names]) => names).find((n) => file.startsWith(`${n}-`));
        if (page) pages.set(page, file);
      }
      if (ROUTE_PAGES.some(([, names]) => names.some((n) => !pages.has(n)))) return;

      // BFS del grafo de imports de cada chunk de página (chunks de app;
      // vendor/runtime/entry ya van en el modulepreload estático del HTML).
      const importsOf = (file: string): string[] => {
        const src = readFileSync(path.join(assetsDir, file), "utf8");
        return [...src.matchAll(/from"\.\/([^"]+\.js)"/g)].map((m) => m[1]).filter((dep) => !ALWAYS_PRELOADED.test(dep));
      };
      const depsOf = (start: string): string[] => {
        const seen = new Set([start]);
        const queue = [start];
        while (queue.length > 0) {
          const file = queue.pop() ?? "";
          for (const dep of importsOf(file)) {
            if (!assets.includes(dep)) continue;
            if (!seen.has(dep)) {
              seen.add(dep);
              queue.push(dep);
            }
          }
        }
        return [...seen];
      };

      const url = (file: string) => `/assets/${file}`;
      const routes: [string, string[]][] = ROUTE_PAGES.map(([prefix, names]) => [
        prefix,
        [...new Set(names.flatMap((n) => depsOf(pages.get(n) ?? n)))].map(url),
      ]);
      const map = JSON.stringify(Object.fromEntries(routes));

      const script = [
        "    <script>",
        `      var m=${map};`,
        "      var p=location.pathname.split(\"?\")[0];",
        "      var hit=Object.keys(m).filter(function(k){return k!==\"/\"&&(p===k||p.startsWith(k+\"/\"));}).sort(function(a,b){return b.length-a.length;})[0];",
        "      if(!hit&&p===\"/\"&&m[\"/\"])hit=\"/\";",
        "      if(hit){var h=document.head;for(var i=0;i<m[hit].length;i++){var l=document.createElement(\"link\");l.rel=\"modulepreload\";l.crossOrigin=\"\";l.href=m[hit][i];h.appendChild(l);}}",
        "    </script>",
      ].join("\n");
      const htmlPath = path.resolve(import.meta.dirname, "./dist/index.html");
      const html = readFileSync(htmlPath, "utf8");
      if (html.includes("genova-route-preload")) return;
      writeFileSync(htmlPath, html.replace("</head>", `${script}\n  </head>`));
    },
  };
}

export default defineConfig(({ mode }) => {
  const { prod, develop } = apiBases(mode);
  return {
    plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss(), preloadDisplayFont(), preloadRouteChunks()],
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
      // En desarrollo Vite compila cada módulo la primera vez que se pide: sin
      // esto, abrir una página por primera vez tardaba segundos (Modelos, 4,5 s)
      // mientras se transformaba su árbol. Se precompila al arrancar.
      warmup: {
        clientFiles: [
          "./src/main.tsx",
          "./src/app/layout/app-layout.tsx",
          "./src/features/*/pages/*-page.tsx",
        ],
      },
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
