import { describe, expect, it } from "vitest";

import { formatShortDate, meaningfulDescription, visibleVersion } from "./ova-card-format";

describe("meaningfulDescription", () => {
  it("oculta la descripción que repite el título", () => {
    expect(meaningfulDescription({ title: "OVA e2e abc", description: "OVA e2e abc" })).toBe("");
  });

  it("oculta la descripción cuando el título es su versión truncada", () => {
    expect(
      meaningfulDescription({
        title: "Ley de Ohm y análisis de circuitos…",
        description: "Ley de Ohm y análisis de circuitos en serie y paralelo.",
      }),
    ).toBe("");
  });

  it("muestra la descripción que aporta información", () => {
    expect(meaningfulDescription({ title: "Álgebra", description: "Matrices y vectores" })).toBe(
      "Matrices y vectores",
    );
  });
});

describe("formatShortDate / visibleVersion", () => {
  it("devuelve cadena vacía sin fecha válida", () => {
    expect(formatShortDate(undefined)).toBe("");
    expect(formatShortDate("no-es-fecha")).toBe("");
  });

  it("solo muestra la versión a partir de la 2", () => {
    expect(visibleVersion({ id: "a", version_number: 1 })).toBeNull();
    expect(visibleVersion({ id: "a", version_number: 3 })).toBe(3);
  });
});
