import { describe, expect, it } from "vitest";

import { hasCheck, providerCheckText } from "./platform-provider-check";

const result = (code: string, models: number | null = null) => ({
  provider: "openrouter",
  code,
  models,
});

describe("providerCheckText", () => {
  it("cuenta los modelos cuando conecta", () => {
    expect(providerCheckText(result("connected", 312))).toMatchObject({
      tone: "success",
      label: "Conectado · 312 modelos",
    });
    expect(providerCheckText(result("connected", 1)).label).toBe("Conectado · 1 modelo");
    expect(providerCheckText(result("connected")).label).toBe("Conectado");
  });

  it("dice qué falló y qué hacer", () => {
    expect(providerCheckText(result("invalid_key"))).toMatchObject({
      tone: "error",
      label: "Clave no válida",
    });
    expect(providerCheckText(result("unreachable")).label).toBe("Sin respuesta");
    expect(providerCheckText(result("rate_limited")).hint).toMatch(/minuto/);
    expect(providerCheckText(result("unchecked")).tone).toBe("neutral");
    expect(providerCheckText(result("rarísimo")).label).toBe("No se pudo comprobar");
  });
});

describe("hasCheck", () => {
  it("solo hay algo que decir si se comprobó o se está comprobando", () => {
    expect(hasCheck({ checking: false, result: null, error: null })).toBe(false);
    expect(hasCheck({ checking: true, result: null, error: null })).toBe(true);
    expect(hasCheck({ checking: false, result: result("connected", 3), error: null })).toBe(true);
  });
});
