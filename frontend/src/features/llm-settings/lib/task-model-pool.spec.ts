import { describe, expect, it } from "vitest";

import { modelsForTask } from "./task-model-pool";

const M = (model_id: string, aptitudes?: string[], category?: string) => ({
  model_id,
  aptitudes,
  category,
});

describe("modelsForTask", () => {
  const catalog = [
    M("deepseek", ["texto", "orquestador", "razonamiento"]),
    M("coder", ["codigo"]),
    M("nano-banana", ["imagen"], "imagen"),
    M("orpheus", ["audio"], "audio"),
    M("prompt-guard", ["moderacion"], "moderacion"),
    M("edita-imagen", [], "imagen"),
    M("antiguo-texto", undefined, "texto"),
    M("antiguo-video", undefined, "video"),
  ];

  it("en las tareas de texto quita lo que no escribe texto", () => {
    // Nano Banana salía en Código; Orpheus y Prompt Guard, como modelos de texto.
    expect(modelsForTask(catalog, "codigo").map((m) => m.model_id)).toEqual([
      "coder",
      "deepseek",
      "antiguo-texto",
    ]);
  });

  it("imagen solo ofrece los que la generan", () => {
    expect(modelsForTask(catalog, "imagen").map((m) => m.model_id)).toEqual(["nano-banana"]);
  });
});
