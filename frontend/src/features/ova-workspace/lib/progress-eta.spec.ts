import { describe, expect, it } from "vitest";

import type { ResourceVM } from "./ova-job-view-model";
import { announceChange, formatEta } from "./progress-view-model";

const vm = (id: string, status: ResourceVM["status"]): ResourceVM => ({
  id,
  phase: "engage",
  phaseLabel: "Enganchar",
  label: `Recurso ${id}`,
  emoji: "",
  status,
  error_id: null,
  selectable: false,
});

describe("formatEta", () => {
  it("no muestra nada sin estimación", () => {
    expect(formatEta(null)).toBeNull();
  });
  it("redondea a minutos y no promete precisión", () => {
    expect(formatEta({ seconds: 70, basis: "historial" })).toBe("≈ 1 min restante");
    expect(formatEta({ seconds: 200, basis: "historial" })).toBe("≈ 3 min restante");
    expect(formatEta({ seconds: 40, basis: "historial" })).toBe("Menos de 1 min restante");
    expect(formatEta({ seconds: 5, basis: "historial" })).toBe("Casi listo");
  });
  it("avisa cuando es una estimación inicial", () => {
    expect(formatEta({ seconds: 130, basis: "estimado" })).toBe(
      "≈ 2 min restante (estimación inicial)",
    );
  });
});

describe("announceChange", () => {
  it("anuncia solo los recursos que cambiaron", () => {
    const prev = { a: "generando", b: "pendiente" };
    expect(announceChange(prev, [vm("a", "check"), vm("b", "pendiente")])).toBe("Recurso a: listo");
  });
  it("no anuncia el primer render ni recursos sin cambio", () => {
    expect(announceChange({}, [vm("a", "pendiente")])).toBeNull();
    expect(announceChange({ a: "check" }, [vm("a", "check")])).toBeNull();
  });
});
