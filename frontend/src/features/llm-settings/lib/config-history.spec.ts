import { describe, expect, it } from "vitest";

import type { ConfigChange } from "../api/model-tools.api";
import { changesSummary, sourceLabel, whenLabel } from "./config-history";

const change = (text: string): ConfigChange => ({
  task: "texto",
  field: "primary",
  before: "a",
  after: "b",
  text,
});

describe("changesSummary", () => {
  it("resume el primer cambio y cuenta el resto", () => {
    expect(changesSummary([])).toBe("");
    expect(changesSummary([change("Texto: A → B")])).toBe("Texto: A → B");
    expect(changesSummary([change("Texto: A → B"), change("x")])).toBe(
      "Texto: A → B y 1 cambio más",
    );
    expect(changesSummary([change("Texto: A → B"), change("x"), change("y")])).toBe(
      "Texto: A → B y 2 cambios más",
    );
  });
});

describe("sourceLabel", () => {
  it("dice de dónde salió el cambio", () => {
    expect(sourceLabel({ source: "manual", detail: null })).toBe("Guardó cambios");
    expect(sourceLabel({ source: "profile", detail: "Económico" })).toBe(
      "Aplicó el perfil «Económico»",
    );
    expect(sourceLabel({ source: "undo", detail: null })).toBe("Deshizo un cambio");
    expect(sourceLabel({ source: "restore", detail: null })).toBe("Restauró una versión anterior");
  });
});

describe("whenLabel", () => {
  const now = new Date(2026, 8, 23, 15, 0);
  it("es relativo en la última hora y con fecha después", () => {
    expect(whenLabel(new Date(2026, 8, 23, 14, 59, 40).toISOString(), now)).toBe("Hace un momento");
    expect(whenLabel(new Date(2026, 8, 23, 14, 48).toISOString(), now)).toBe("Hace 12 min");
    expect(whenLabel(new Date(2026, 8, 23, 9, 5).toISOString(), now)).toMatch(/^Hoy, 09:05/);
    expect(whenLabel(new Date(2026, 8, 22, 18, 30).toISOString(), now)).toMatch(/^Ayer, 18:30/);
    expect(whenLabel(new Date(2026, 8, 3, 18, 20).toISOString(), now)).toMatch(/^3 sept/);
    expect(whenLabel("no es fecha", now)).toBe("");
  });
});
