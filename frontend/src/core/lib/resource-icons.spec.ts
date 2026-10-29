import { describe, expect, it } from "vitest";

import { ICONS } from "@/core/components/icon-registry";
import { LAZY_ICONS } from "@/core/components/icon-registry-lazy";

import { resourceIconName } from "./resource-icons";

describe("iconos de recursos", () => {
  it("el mismo recurso tiene el mismo icono en Title Case y en mayúscula de oración", () => {
    expect(resourceIconName("Cómic Interactivo")).toBe(resourceIconName("Cómic interactivo"));
    expect(resourceIconName("Cómic interactivo")).toBe("ph-book-open");
    expect(resourceIconName("Micro-podcast")).toBe("ph-microphone");
  });

  it("«cómic» no se confunde con el micrófono", () => {
    expect(resourceIconName("Cómic de prueba")).not.toBe("ph-microphone");
  });

  it("todo icono del mapa existe en el registro (no sale «?»)", () => {
    const tipos = ["Applet GeoGebra", "Applet geogebra", "Cómic interactivo", "Quiz adaptativo", "Diploma de logro"];
    for (const tipo of tipos) {
      const slug = resourceIconName(tipo).replace(/^ph-/, "");
      expect(Object.hasOwn({ ...ICONS, ...LAZY_ICONS }, slug), `${tipo} → ${slug}`).toBe(true);
    }
  });
});
