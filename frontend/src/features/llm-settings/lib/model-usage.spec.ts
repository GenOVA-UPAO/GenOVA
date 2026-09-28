import type { Draft } from "./llm-config-draft";
import { configUsage, modelUsage, usageSummary } from "./model-usage";

const e = (model_id: string) => ({ provider: "p", model_id });

const draft: Draft = {
  texto: { default: e("a"), fallbacks: [e("b")] },
  codigo: { default: e("a"), fallbacks: [e("a2"), { provider: "", model_id: "" }] },
};

describe("modelUsage", () => {
  it("dice en qué tareas y huecos se usa cada modelo", () => {
    expect(modelUsage(draft, ["texto", "codigo"])).toEqual({
      "p::a": ["Texto", "Código / HTML"],
      "p::b": ["Texto (respaldo)"],
      "p::a2": ["Código / HTML (respaldo)"],
    });
  });

  it("omite el hueco que se está editando", () => {
    const usage = modelUsage(draft, ["texto", "codigo"], { task: "texto", index: -1 });
    expect(usage["p::a"]).toEqual(["Código / HTML"]);
    const fallback = modelUsage(draft, ["texto", "codigo"], { task: "texto", index: 0 });
    expect(fallback["p::b"]).toBeUndefined();
  });

  it("lee una configuración guardada", () => {
    expect(configUsage({ defaults: { texto: e("a") }, fallbacks: { texto: [e("b")] } })).toEqual({
      "p::a": ["Texto"],
      "p::b": ["Texto (respaldo)"],
    });
    expect(configUsage(null)).toEqual({});
  });
});

describe("usageSummary", () => {
  it("resume listas largas", () => {
    expect(usageSummary(["Texto"])).toBe("Texto");
    expect(usageSummary(["Texto", "Código / HTML"])).toBe("Texto y Código / HTML");
    expect(usageSummary(["Texto", "Código / HTML", "Orquestador", "Razonamiento"])).toBe(
      "Texto, Código / HTML y 2 más",
    );
  });
});
