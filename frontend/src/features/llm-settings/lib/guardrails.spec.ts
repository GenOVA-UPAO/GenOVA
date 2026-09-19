import { describe, expect, it } from "vitest";

import {
  formatModerationModel,
  guardrailsHasChanges,
  normalizeTerms,
  parseGuardrailsConfig,
  parseModerationModel,
  serializeTerms,
  toGuardrailsPayload,
  topicImpact,
} from "./guardrails";

describe("normalizeTerms", () => {
  it("separa por lineas, recorta y descarta vacias", () => {
    expect(normalizeTerms("arma\n  droga \n\n  violencia  \n")).toEqual([
      "arma",
      "droga",
      "violencia",
    ]);
  });

  it("tolera CRLF y \r suelto", () => {
    expect(normalizeTerms("a\r\nb\rc")).toEqual(["a", "b", "c"]);
  });

  it("elimina duplicados sin distinguir mayusculas, conserva el primero", () => {
    expect(normalizeTerms("nudo\nNudo\nNUDO\notra")).toEqual(["nudo", "otra"]);
  });

  it("texto vacio o solo espacios -> lista vacia", () => {
    expect(normalizeTerms("")).toEqual([]);
    expect(normalizeTerms("   \n \n")).toEqual([]);
  });
});

describe("serializeTerms", () => {
  it("una linea por termino y vacio sin terminos", () => {
    expect(serializeTerms(["a", "b"])).toBe("a\nb");
    expect(serializeTerms([])).toBe("");
  });

  it("roundtrip textarea <-> lista", () => {
    const raw = "arma\n\n  violencia \nvioLENCIA\n";
    expect(serializeTerms(normalizeTerms(raw))).toBe("arma\nviolencia");
  });
});

describe("parseModerationModel / formatModerationModel", () => {
  it("parte en el PRIMER slash (los model_id pueden llevar /)", () => {
    expect(parseModerationModel("openrouter/deepseek/deepseek-chat-v3.1")).toEqual({
      provider: "openrouter",
      modelId: "deepseek/deepseek-chat-v3.1",
    });
  });

  it("vacio y sin slash -> null", () => {
    expect(parseModerationModel("")).toBeNull();
    expect(parseModerationModel("sin-slash")).toBeNull();
    expect(parseModerationModel("/model")).toBeNull();
  });

  it("format y parse son inversos; sin proveedor o modelo -> vacio", () => {
    expect(formatModerationModel("openrouter", "deepseek/a")).toBe("openrouter/deepseek/a");
    expect(formatModerationModel("", "a")).toBe("");
    expect(formatModerationModel("openrouter", "")).toBe("");
    const f = formatModerationModel("openrouter", "deepseek/a");
    expect(parseModerationModel(f)).toEqual({ provider: "openrouter", modelId: "deepseek/a" });
  });
});

describe("parseGuardrailsConfig", () => {
  it("lee el contrato con strings 1/0 y términos como string", () => {
    const cfg = parseGuardrailsConfig({
      guardrail_topic_enabled: "1",
      guardrail_topic_area: "machine learning",
      guardrail_moderation_enabled: "0",
      guardrail_moderation_terms: "arma\nviolencia",
      guardrail_moderation_model: "openrouter/deepseek/a",
    });
    expect(cfg).toEqual({
      topicEnabled: true,
      topicArea: "machine learning",
      moderationEnabled: false,
      terms: ["arma", "violencia"],
      moderationModel: "openrouter/deepseek/a",
    });
  });

  it("términos como array y valores ausentes -> defaults seguros (sin restricción)", () => {
    const cfg = parseGuardrailsConfig({ guardrail_moderation_terms: ["a", " a "] });
    expect(cfg?.terms).toEqual(["a"]);
    expect(cfg?.topicEnabled).toBe(false);
    expect(cfg?.moderationModel).toBe("");
  });

  it("payload no objeto -> null", () => {
    expect(parseGuardrailsConfig(null)).toBeNull();
    expect(parseGuardrailsConfig("x")).toBeNull();
  });
});

describe("toGuardrailsPayload", () => {
  it("serializa al formato del contrato", () => {
    expect(
      toGuardrailsPayload({
        topicEnabled: true,
        topicArea: "  machine learning y ciencia de datos  ",
        moderationEnabled: true,
        termsText: "arma\n\nviolencia\narma",
        model: { provider: "openrouter", modelId: "deepseek/a" },
      }),
    ).toEqual({
      guardrail_topic_enabled: "1",
      guardrail_topic_area: "machine learning y ciencia de datos",
      guardrail_moderation_enabled: "1",
      guardrail_moderation_terms: "arma\nviolencia",
      guardrail_moderation_model: "openrouter/deepseek/a",
    });
  });

  it("sin modelo de moderacion manda cadena vacia", () => {
    const payload = toGuardrailsPayload({
      topicEnabled: false,
      topicArea: "",
      moderationEnabled: true,
      termsText: "a",
      model: { provider: "", modelId: "" },
    });
    expect(payload["guardrail_moderation_model"]).toBe("");
  });
});

describe("guardrailsHasChanges", () => {
  const base = {
    topicEnabled: true,
    topicArea: "machine learning",
    moderationEnabled: false,
    terms: ["arma"],
    moderationModel: "",
  };

  it("borrador identico (con espacios) no cuenta como cambio", () => {
    expect(
      guardrailsHasChanges(base, {
        topicEnabled: true,
        topicArea: "machine learning  ",
        moderationEnabled: false,
        termsText: "arma\n \n",
        model: { provider: "", modelId: "" },
      }),
    ).toBe(false);
  });

  it("cambia si cambia el area, el flag, un termino o el modelo", () => {
    expect(
      guardrailsHasChanges(base, {
        topicEnabled: false,
        topicArea: "machine learning",
        moderationEnabled: false,
        termsText: "arma",
        model: { provider: "", modelId: "" },
      }),
    ).toBe(true);
    expect(
      guardrailsHasChanges(base, {
        topicEnabled: true,
        topicArea: "machine learning",
        moderationEnabled: false,
        termsText: "arma\notra",
        model: { provider: "", modelId: "" },
      }),
    ).toBe(true);
    expect(
      guardrailsHasChanges(base, {
        topicEnabled: true,
        topicArea: "machine learning",
        moderationEnabled: false,
        termsText: "arma",
        model: { provider: "openrouter", modelId: "a" },
      }),
    ).toBe(true);
  });

  it("sin config cargada no hay cambios", () => {
    expect(
      guardrailsHasChanges(null, {
        topicEnabled: true,
        topicArea: "x",
        moderationEnabled: false,
        termsText: "",
        model: { provider: "", modelId: "" },
      }),
    ).toBe(false);
  });
});

describe("topicImpact", () => {
  it("desactivado o area vacia = cualquier tema", () => {
    expect(
      topicImpact({
        topicEnabled: false,
        topicArea: "ml",
        moderationEnabled: false,
        termsText: "",
        model: { provider: "", modelId: "" },
      }),
    ).toEqual({ restricted: false, area: "" });
    expect(
      topicImpact({
        topicEnabled: true,
        topicArea: "   ",
        moderationEnabled: false,
        termsText: "",
        model: { provider: "", modelId: "" },
      }),
    ).toEqual({ restricted: false, area: "" });
  });

  it("activado con area = restringido", () => {
    expect(
      topicImpact({
        topicEnabled: true,
        topicArea: " machine learning ",
        moderationEnabled: false,
        termsText: "",
        model: { provider: "", modelId: "" },
      }),
    ).toEqual({ restricted: true, area: "machine learning" });
  });
});
