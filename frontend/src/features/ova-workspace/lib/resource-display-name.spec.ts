import { describe, expect, it } from "vitest";

import { resourceDisplayName } from "./resource-display-name";

describe("resourceDisplayName", () => {
  it("pasa los nombres del catálogo a mayúscula de oración", () => {
    expect(resourceDisplayName("Cómic Interactivo")).toBe("Cómic interactivo");
    expect(resourceDisplayName("Juego de Gamificación")).toBe("Juego de gamificación");
    expect(resourceDisplayName("Micro-Podcast")).toBe("Micro-podcast");
    expect(resourceDisplayName("Juego Drag & Drop")).toBe("Juego drag & drop");
  });

  it("conserva las siglas", () => {
    expect(resourceDisplayName("FAQ Interactivo")).toBe("FAQ interactivo");
  });

  it("no toca títulos que no son del catálogo", () => {
    expect(resourceDisplayName("Ley de Ohm y Kirchhoff")).toBe("Ley de Ohm y Kirchhoff");
    expect(resourceDisplayName("Engage 1")).toBe("Engage 1");
  });
});
