import { describe, expect, it } from "vitest";

import {
  formatShortDate,
  lastActivity,
  meaningfulDescription,
  relativeDate,
  trashedAt,
  visibleVersion,
} from "./ova-card-format";

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

describe("relativeDate / lastActivity", () => {
  const now = new Date(2026, 8, 23, 15, 0);

  it("usa lenguaje relativo durante la última semana", () => {
    expect(relativeDate(new Date(2026, 8, 23, 14, 59, 40), now)).toBe("hace un momento");
    expect(relativeDate(new Date(2026, 8, 23, 14, 40), now)).toBe("hace 20 minutos");
    expect(relativeDate(new Date(2026, 8, 23, 12, 0), now)).toBe("hace 3 horas");
    expect(relativeDate(new Date(2026, 8, 22, 18, 0), now)).toBe("ayer");
    expect(relativeDate(new Date(2026, 8, 19, 9, 0), now)).toBe("hace 4 días");
  });

  it("pasa a la fecha corta a partir de una semana", () => {
    expect(relativeDate(new Date(2026, 7, 3, 9, 0), now)).toBe(`el ${formatShortDate(new Date(2026, 7, 3, 9, 0).toISOString())}`);
  });

  it("muestra la edición solo si llegó bastante después de crear el OVA", () => {
    const created = new Date(2026, 8, 20, 10, 0).toISOString();
    const justGenerated = new Date(2026, 8, 20, 10, 3).toISOString();
    const edited = new Date(2026, 8, 23, 13, 0).toISOString();
    expect(lastActivity({ id: "a", created_at: created, updated_at: justGenerated }, now)?.label).toBe(
      "Creado hace 3 días",
    );
    expect(lastActivity({ id: "a", created_at: created, updated_at: edited }, now)?.label).toBe(
      "Editado hace 2 horas",
    );
    expect(lastActivity({ id: "a" }, now)).toBeNull();
  });

  it("describe la fecha de la papelera sin decir «eliminado»", () => {
    const deleted = new Date(2026, 8, 22, 9, 0).toISOString();
    expect(trashedAt({ id: "a", deleted_at: deleted }, now)?.label).toBe("Movido a la papelera ayer");
  });
});
