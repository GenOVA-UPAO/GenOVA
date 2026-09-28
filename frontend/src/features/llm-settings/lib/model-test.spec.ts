import { describe, expect, it } from "vitest";

import type { ModelTestResult } from "../api/model-tools.api";
import { formatLatency, keySourceText, modelTestOutcome } from "./model-test";

const base: ModelTestResult = {
  ok: false,
  code: "error",
  provider: "openrouter",
  model_id: "deepseek/deepseek-v4.1-flash",
  latency_ms: 812,
  excerpt: null,
  simulated: false,
};

describe("modelTestOutcome", () => {
  it("dice que responde cuando fue bien", () => {
    expect(modelTestOutcome({ ...base, ok: true, code: "ok" })).toEqual({
      tone: "success",
      title: "Responde",
      hint: "",
    });
  });

  it("explica qué hacer en cada fallo, con rojo solo para lo que hay que arreglar", () => {
    expect(modelTestOutcome({ ...base, code: "invalid_key" }).title).toBe("Clave no válida");
    expect(modelTestOutcome({ ...base, code: "invalid_key" }).hint).toMatch(/Credenciales/);
    expect(modelTestOutcome({ ...base, code: "no_credit" }).title).toBe("Sin crédito");
    expect(modelTestOutcome({ ...base, code: "model_not_found" }).tone).toBe("error");
    expect(modelTestOutcome({ ...base, code: "rate_limited" }).tone).toBe("warning");
    expect(modelTestOutcome({ ...base, code: "timeout" }).title).toBe("No respondió a tiempo");
    expect(modelTestOutcome({ ...base, code: "raro" }).title).toBe(
      "El proveedor devolvió un error",
    );
  });
});

describe("formatLatency", () => {
  it("usa ms por debajo del segundo y s con coma decimal por encima", () => {
    expect(formatLatency(null)).toBeNull();
    expect(formatLatency(812.4)).toBe("812 ms");
    expect(formatLatency(2400)).toBe("2,4 s");
  });
});

describe("keySourceText", () => {
  it("dice con qué clave se probó", () => {
    expect(keySourceText("platform")).toBe("Con la clave de la plataforma.");
    expect(keySourceText("own")).toBe("Con tu clave.");
    expect(keySourceText(undefined)).toBeNull();
  });
});
