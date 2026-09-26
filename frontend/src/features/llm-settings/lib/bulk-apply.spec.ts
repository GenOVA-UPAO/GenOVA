import { applyTargets, applyToTasks, previewApply } from "./bulk-apply";
import type { Draft } from "./llm-config-draft";

const e = (model_id: string) => ({ provider: "openrouter", model_id });

function draft(): Draft {
  return {
    texto: { default: e("flash"), fallbacks: [e("v4"), e("gemini")] },
    codigo: { default: e("codex"), fallbacks: [e("flash"), e("qwen")] },
    orquestador: { default: e("flash"), fallbacks: [] },
    razonamiento: { default: { provider: "", model_id: "" }, fallbacks: [] },
    imagen: { default: { provider: "runware", model_id: "flux" }, fallbacks: [] },
  };
}

const tasks = ["texto", "codigo", "orquestador", "razonamiento", "imagen"];

describe("applyTargets", () => {
  it("ofrece las demás tareas de texto, nunca imagen ni video", () => {
    expect(applyTargets([...tasks, "video"], "texto")).toEqual([
      "codigo",
      "orquestador",
      "razonamiento",
    ]);
  });
});

describe("previewApply", () => {
  it("dice qué cambia y qué ya estaba igual", () => {
    const preview = previewApply(
      draft(),
      "texto",
      ["codigo", "orquestador", "razonamiento"],
      false,
    );
    expect(preview.map((p) => [p.task, p.from.model_id, p.to.model_id, p.unchanged])).toEqual([
      ["codigo", "codex", "flash", false],
      ["orquestador", "flash", "flash", true],
      ["razonamiento", "", "flash", false],
    ]);
  });

  it("con respaldos, una tarea con el mismo principal puede cambiar", () => {
    const [orq] = previewApply(draft(), "texto", ["orquestador"], true);
    expect(orq.unchanged).toBe(false);
    expect(orq.fallbacksTo.map((f) => f.model_id)).toEqual(["v4", "gemini"]);
  });

  it("no ofrece nada si la tarea de origen no tiene modelo", () => {
    expect(previewApply(draft(), "razonamiento", ["texto"], false)).toEqual([]);
  });
});

describe("applyToTasks", () => {
  it("copia el principal y quita de los respaldos el que pasaría a estar repetido", () => {
    const next = applyToTasks(draft(), "texto", ["codigo"], false);
    expect(next.codigo.default.model_id).toBe("flash");
    expect(next.codigo.fallbacks.map((f) => f.model_id)).toEqual(["qwen"]);
    expect(next.texto).toEqual(draft().texto);
  });

  it("copia también los respaldos si se pide", () => {
    const next = applyToTasks(draft(), "texto", ["codigo", "razonamiento"], true);
    expect(next.codigo.fallbacks.map((f) => f.model_id)).toEqual(["v4", "gemini"]);
    expect(next.razonamiento.fallbacks.map((f) => f.model_id)).toEqual(["v4", "gemini"]);
  });

  it("no toca las tareas que no se eligen", () => {
    const before = draft();
    const next = applyToTasks(before, "texto", ["codigo"], true);
    expect(next.orquestador).toBe(before.orquestador);
    expect(next.imagen).toBe(before.imagen);
  });
});
