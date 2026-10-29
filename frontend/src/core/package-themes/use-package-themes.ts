import { useQuery } from "@tanstack/react-query";

import { apiJson } from "@/core/lib/http";

export interface PackageTheme {
  id: string;
  label: string;
  tokens: Record<string, string>;
  css: string;
  replacements?: [string, string][];
}

export function usePackageThemes() {
  return useQuery({
    queryKey: ["package-themes"],
    queryFn: () => apiJson<{ themes: PackageTheme[] }>("/api/ovas/package-themes/catalog"),
    staleTime: Infinity,
  });
}

export function usePackageTheme(theme = "upao") {
  const catalog = usePackageThemes();
  return catalog.data?.themes.find((item) => item.id === theme);
}

const THEME_START = "<!--genova-package-theme-->";
const THEME_END = "<!--/genova-package-theme-->";

/** Quita un bloque de tema ya inyectado (marcadores, no regex de etiquetas). */
function stripPreviousTheme(html: string): string {
  let start = html.indexOf(THEME_START);
  while (start !== -1) {
    const end = html.indexOf(THEME_END, start);
    if (end === -1) break;
    html = html.slice(0, start) + html.slice(end + THEME_END.length);
    start = html.indexOf(THEME_START);
  }
  return html;
}

// Mismo ajuste que el exportador: solo dentro del script «UPAO Components v1.0»,
// recorriendo los `<script>` por posición (cierre = `</script` … `>`). 
function upgradeResourceComponents(html: string, replacements: [string, string][] = []) {
  const lower = html.toLowerCase();
  const out: string[] = [];
  let pos = 0;
  for (let open = lower.indexOf("<script", pos); open !== -1; open = lower.indexOf("<script", pos)) {
    const close = lower.indexOf("</script", open);
    if (close === -1) break;
    const gt = lower.indexOf(">", close);
    const end = gt === -1 ? html.length : gt + 1;
    let script = html.slice(open, end);
    if (script.includes("UPAO Components v1.0")) {
      for (const [old, replacement] of replacements) script = script.replaceAll(old, replacement);
    }
    out.push(html.slice(pos, open), script);
    pos = end;
  }
  out.push(html.slice(pos));
  return out.join("");
}

export function applyPackageTheme(html: string, theme?: PackageTheme | string): string {
  const css = typeof theme === "string" ? theme : theme?.css;
  if (!html || css === undefined) return html;
  let clean = stripPreviousTheme(html);
  // «Paleta del OVA»: sin variables que inyectar, solo se quita el tema anterior.
  if (!css) return clean;
  if (typeof theme !== "string") clean = upgradeResourceComponents(clean, theme?.replacements);
  const style = `${THEME_START}<style id="genova-package-theme">${css}</style>${THEME_END}`;
  if (/<\/head\s*>/i.test(clean)) return clean.replace(/<\/head\s*>/i, `${style}</head>`);
  if (/<html\b[^>]*>/i.test(clean)) return clean.replace(/<html\b[^>]*>/i, `$&<head>${style}</head>`);
  return style + clean;
}
