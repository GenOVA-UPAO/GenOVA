import { describe, expect, it } from "vitest";

import { groupModels, modalityBucket, sortModels } from "./catalog-sort";
import type { CatalogModel } from "./user-llm-settings.types";

const M = (overrides: Partial<CatalogModel>): CatalogModel => ({
  provider: "openrouter",
  model_id: "x",
  label: "X",
  ...overrides,
});

describe("sortModels", () => {
  it("default devuelve el array tal cual (orden del servidor)", () => {
    const arr: CatalogModel[] = [M({ model_id: "b" }), M({ model_id: "a" })];
    expect(sortModels(arr, "default")).toBe(arr);
  });

  it("price-asc ordena por output ascendente", () => {
    const caro = M({ model_id: "caro", pricing_detail: { input: 1, output: 5 } });
    const barato = M({ model_id: "barato", pricing_detail: { input: 0.1, output: 0.2 } });
    expect(sortModels([caro, barato], "price-asc").map((m) => m.model_id)).toEqual([
      "barato",
      "caro",
    ]);
  });

  it("price-desc ordena por output descendente", () => {
    const caro = M({ model_id: "caro", pricing_detail: { output: 5 } });
    const barato = M({ model_id: "barato", pricing_detail: { output: 0.2 } });
    expect(sortModels([barato, caro], "price-desc").map((m) => m.model_id)).toEqual([
      "caro",
      "barato",
    ]);
  });

  it("los sin pricing_detail (Variable) van SIEMPRE al final, con nombre como desempate", () => {
    const variable = M({ model_id: "auto", label: "Auto Router" });
    const variable2 = M({ model_id: "fusion", label: "Fusion" });
    const conocido = M({ model_id: "p", pricing_detail: { output: 3 } });
    const asc = sortModels([variable, variable2, conocido], "price-asc");
    expect(asc.slice(-2).map((m) => m.model_id)).toEqual(["auto", "fusion"]);
    expect(asc[0].model_id).toBe("p");
    const desc = sortModels([variable, conocido], "price-desc");
    expect(desc[desc.length - 1].model_id).toBe("auto");
  });

  it("name-asc ordena por label con fallback a model_id", () => {
    const z = M({ model_id: "zz", label: "Zeta" });
    const alpha = M({ model_id: "aa", label: "Alfa" });
    const sinLabel = M({ model_id: "mm", label: undefined });
    expect(sortModels([z, alpha, sinLabel], "name-asc").map((m) => m.label || m.model_id)).toEqual([
      "Alfa",
      "mm",
      "Zeta",
    ]);
  });

  it("context-desc pone el mayor contexto primero y el sin contexto al final", () => {
    const grande = M({ model_id: "grande", context_length: 1_000_000 });
    const chico = M({ model_id: "chico", context_length: 8000 });
    const sinCtx = M({ model_id: "sinctx" });
    expect(sortModels([sinCtx, chico, grande], "context-desc").map((m) => m.model_id)).toEqual([
      "grande",
      "chico",
      "sinctx",
    ]);
  });

  it("no muta el array de entrada", () => {
    const orig = [M({ model_id: "b", pricing_detail: { output: 2 } }), M({ model_id: "a" })];
    const copia = [...orig];
    sortModels(orig, "price-asc");
    expect(orig.map((m) => m.model_id)).toEqual(copia.map((m) => m.model_id));
  });
});

describe("modalityBucket", () => {
  it("valores reales del backend", () => {
    expect(modalityBucket("text->text")).toBe("texto");
    expect(modalityBucket("text+image->text")).toBe("imagen");
    // Prioridad imagen > video > audio > archivos: el cubo es el input más
    // rico (documentado en catalog-sort.ts).
    expect(modalityBucket("text+image+file+audio+video->text")).toBe("imagen");
    expect(modalityBucket("text+image+file+video->text")).toBe("imagen");
    expect(modalityBucket("text+image+file+audio->text")).toBe("imagen");
    expect(modalityBucket("text+file->text")).toBe("archivos");
    expect(modalityBucket(undefined)).toBe("otra");
    expect(modalityBucket("video->text")).toBe("video");
    expect(modalityBucket("text+image+audio+video->text")).toBe("imagen");
    expect(modalityBucket("text+audio->text+audio")).toBe("audio");
  });

  it("sin tokens conocidos cae en otra", () => {
    expect(modalityBucket("embedding->vector")).toBe("otra");
  });
});

describe("groupModels", () => {
  it("por proveedor usa la etiqueta del label map", () => {
    const groups = groupModels(
      [M({ provider: "groq" }), M({ provider: "openrouter" })],
      "provider",
      { groq: "Groq", openrouter: "OpenRouter" },
    );
    expect(groups.map((g) => g.key)).toEqual(["groq", "openrouter"]);
    expect(groups[0].label).toBe("Groq");
  });

  it("con orden explícito conserva el grupo del primer modelo ordenado", () => {
    const groups = groupModels(
      [
        M({ provider: "openrouter", model_id: "barato" }),
        M({ provider: "groq", model_id: "caro" }),
      ],
      "provider",
      { groq: "Groq", openrouter: "OpenRouter" },
      true,
    );
    expect(groups.map((g) => g.key)).toEqual(["openrouter", "groq"]);
  });

  it("por tipo usa la categoria del modelo", () => {
    const groups = groupModels(
      [M({ model_id: "1", category: "texto" }), M({ model_id: "2", category: "codigo" })],
      "type",
      { codigo: "Código", texto: "Texto" },
    );
    expect(groups.map((g) => g.label)).toEqual(["Código", "Texto"]);
  });

  it("por modalidad ordena los buckets en su orden fijo y los etiqueta", () => {
    const groups = groupModels(
      [
        M({ model_id: "1", modality: "text->text" }),
        M({ model_id: "2", modality: "text+image+file+audio+video->text" }),
        M({ model_id: "3", modality: "text+file->text" }),
      ],
      "modality",
      {},
    );
    expect(groups.map((g) => g.label)).toEqual(["Solo texto", "Acepta imagen", "Acepta archivos"]);
  });

  it("categoria ausente cae a 'otra' con su clave como etiqueta", () => {
    const groups = groupModels([M({ model_id: "1" })], "type", {});
    expect(groups[0].key).toBe("otra");
    expect(groups[0].label).toBe("otra");
  });
});
