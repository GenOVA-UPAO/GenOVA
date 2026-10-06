import { describe, expect, it } from "vitest";

import { applyPackageTheme } from "./use-package-themes";

describe("applyPackageTheme", () => {
  const css = ":root{--primary:#000000 !important;}";

  it("reemplaza el tema al cambiar de selección sin duplicarlo ni alterar scripts", () => {
    const original = "<html><head><style>p{color:#123456}</style></head><body><script>window.quiz=1</script></body></html>";
    const first = applyPackageTheme(original, ":root{--primary:#6330A0 !important;}");
    const result = applyPackageTheme(first, css);
    expect(result.match(/id="genova-package-theme"/g)).toHaveLength(1);
    expect(result).toContain(css);
    expect(result).not.toContain("#6330A0");
    expect(result).toContain("p{color:#123456}");
    expect(result).toContain("<script>window.quiz=1</script>");
    expect(result.indexOf(css)).toBeLessThan(result.indexOf("</head>"));
  });

  it("admite documentos antiguos sin head y deja vacíos sin contenido", () => {
    expect(applyPackageTheme("<html><body>Hola</body></html>", css)).toContain(`<head><!--genova-package-theme--><style id="genova-package-theme">${css}</style><!--/genova-package-theme--></head>`);
    expect(applyPackageTheme("<p>Hola</p>", css)).toContain("<p>Hola</p>");
    expect(applyPackageTheme("", css)).toBe("");
    expect(applyPackageTheme("<p>Hola</p>")).toBe("<p>Hola</p>");
  });

  it("adapta solo el script UPAO identificado sin sustituir estilos del docente", () => {
    const original = '<html><head><style>p{color:#166534}</style></head><body><script>const custom="color:#166534"</script><script>/* UPAO Components v1.0 */const status="color:#166534"</script></body></html>';
    const themed = applyPackageTheme(original, {
      id: "oscuro", label: "Oscuro", tokens: {}, css,
      replacements: [["color:#166534", "color:var(--success,#166534)"]],
    });
    expect(themed).toContain("p{color:#166534}");
    expect(themed).toContain('const custom="color:#166534"');
    expect(themed).toContain('const status="color:var(--success,#166534)"');
  });

  it("no duplica el tema al aplicarlo dos veces y tolera cierres de script raros", () => {
    const html = "<html><head></head><body><script>x</SCRIPT\t></body></html>";
    const twice = applyPackageTheme(applyPackageTheme(html, css), css);
    expect(twice.split("<!--genova-package-theme-->")).toHaveLength(2);
    expect(twice).toContain("<script>x</SCRIPT\t>");
  });
});
