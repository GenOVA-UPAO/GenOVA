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

/** Mismo bloque CSS que el exportador; no altera el HTML almacenado. */
function upgradeResourceComponents(html: string, replacements: [string, string][] = []) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, (script) => {
    if (!script.includes("UPAO Components v1.0")) return script;
    let upgraded = script;
    for (const [old, replacement] of replacements) upgraded = upgraded.replaceAll(old, replacement);
    return upgraded;
  });
}

export function applyPackageTheme(html: string, theme?: PackageTheme | string): string {
  const css = typeof theme === "string" ? theme : theme?.css;
  if (!html || !css) return html;
  let clean = html.replace(/<style\b[^>]*\bid=["']genova-package-theme["'][^>]*>[\s\S]*?<\/style\s*>/gi, "");
  if (typeof theme !== "string") clean = upgradeResourceComponents(clean, theme?.replacements);
  const style = `<style id="genova-package-theme">${css}</style>`;
  if (/<\/head\s*>/i.test(clean)) return clean.replace(/<\/head\s*>/i, `${style}</head>`);
  if (/<html\b[^>]*>/i.test(clean)) return clean.replace(/<html\b[^>]*>/i, `$&<head>${style}</head>`);
  return style + clean;
}
