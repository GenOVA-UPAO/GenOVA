import { describe, expect, it } from "vitest";

import { defaultGenerationEnabled, isMediaTask, toDraft, toPayload } from "./llm-config-draft";
import { enabledOnly, includeSelectedInPool, modelsForTask } from "./task-model-pool";

describe("llmConfigDraft media", () => {
  it("marks imagen/video as media; video generation defaults off", () => {
    expect(isMediaTask("imagen")).toBe(true);
    expect(isMediaTask("video")).toBe(true);
    expect(isMediaTask("texto")).toBe(false);
    expect(defaultGenerationEnabled("video")).toBe(false);
    expect(defaultGenerationEnabled("imagen")).toBe(true);
  });

  it("toDraft/toPayload round-trip generation_enabled", () => {
    const draft = toDraft(
      {
        defaults: {
          imagen: { provider: "runware", model_id: "runware:100@1" },
        },
        fallbacks: {},
        generation_enabled: { imagen: true, video: false },
      },
      ["imagen", "video", "texto"],
    );
    expect(draft["imagen"].generationEnabled).toBe(true);
    expect(draft["video"].generationEnabled).toBe(false);
    expect(draft["texto"].generationEnabled).toBeUndefined();

    const payload = toPayload(draft, ["imagen", "video", "texto"]);
    expect(payload.generation_enabled).toEqual({ imagen: true, video: false });
    expect(payload.defaults?.["imagen"]?.model_id).toBe("runware:100@1");
  });
});

describe("modelsForTask", () => {
  const catalog = [
    { provider: "a", model_id: "1", aptitudes: ["texto", "imagen"] },
    { provider: "b", model_id: "2", aptitudes: ["imagen"] },
    { provider: "c", model_id: "3", aptitudes: ["video"] },
    { provider: "d", model_id: "4", category: "texto" },
  ];

  it("imagen y video filtran de verdad: la aptitud es obligatoria", () => {
    expect(modelsForTask(catalog, "imagen").map((m) => m.model_id)).toEqual(["1", "2"]);
    expect(modelsForTask(catalog, "video").map((m) => m.model_id)).toEqual(["3"]);
  });

  it("las tareas de texto no excluyen a nadie: los aptos van primero", () => {
    // "1" y "4" declaran texto; "2" y "3" no, pero siguen siendo ofrecibles.
    expect(modelsForTask(catalog, "texto").map((m) => m.model_id)).toEqual(["1", "4", "2", "3"]);
  });
});

describe("includeSelectedInPool", () => {
  it("keeps assigned models even when category filter excludes them", () => {
    const all = [
      {
        provider: "openrouter",
        model_id: "deepseek/deepseek-v4-flash",
        category: "codigo",
        label: "DeepSeek",
      },
      { provider: "groq", model_id: "llama", category: "texto", label: "Llama" },
    ];
    // texto ya no excluye: el de categoria "codigo" tambien se ofrece, detras.
    const pool = modelsForTask(all, "texto");
    expect(pool.map((m) => m.model_id)).toEqual(["llama", "deepseek/deepseek-v4-flash"]);
    const merged = includeSelectedInPool(pool, all, [
      { provider: "openrouter", model_id: "deepseek/deepseek-v4-flash" },
      { provider: "openrouter", model_id: "other/missing" },
    ]);
    expect(merged.map((m) => m.model_id)).toEqual([
      "llama",
      "deepseek/deepseek-v4-flash",
      "other/missing",
    ]);
  });
});

describe("enabledOnly", () => {
  const A = { provider: "openrouter", model_id: "a", label: "A" };
  const B = { provider: "openrouter", model_id: "b", label: "B" };
  const C = { provider: "opencode", model_id: "a", label: "C" };

  it("acota el catalogo a lo que el usuario activo", () => {
    expect(enabledOnly([A, B, C], [B])).toEqual([B]);
  });

  it("no confunde el mismo model_id de proveedores distintos", () => {
    expect(enabledOnly([A, B, C], [C])).toEqual([C]);
  });

  it("con la lista vacia devuelve el catalogo entero, no nada", () => {
    expect(enabledOnly([A, B, C], [])).toEqual([A, B, C]);
  });

  it("ignora activados que ya no estan en el catalogo", () => {
    expect(enabledOnly([A], [B])).toEqual([]);
  });
});

describe("modelsForTask: aptitud obligatoria solo en media", () => {
  const conCodigo = { provider: "p", model_id: "c", aptitudes: ["texto", "codigo"] };
  const soloTexto = { provider: "p", model_id: "t", aptitudes: ["texto"] };
  const imagen = { provider: "p", model_id: "i", aptitudes: ["imagen"] };

  it("para codigo NO excluye a los que no declaran la aptitud", () => {
    const out = modelsForTask([soloTexto, conCodigo], "codigo");
    expect(out.map((m) => m.model_id)).toEqual(["c", "t"]);
  });

  it("para texto tampoco excluye, solo ordena", () => {
    expect(modelsForTask([imagen, soloTexto], "texto").map((m) => m.model_id)).toEqual(["t", "i"]);
  });

  it("para imagen SI excluye: un modelo de texto no puede generar imagenes", () => {
    expect(modelsForTask([soloTexto, imagen], "imagen").map((m) => m.model_id)).toEqual(["i"]);
  });

  it("para video tambien excluye", () => {
    expect(modelsForTask([soloTexto, imagen], "video")).toEqual([]);
  });
});
