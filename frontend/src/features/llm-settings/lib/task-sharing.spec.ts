import type { Draft } from "./llm-config-draft";
import { sharedWith, sharingSummary } from "./task-sharing";

const e = (model_id: string) => ({ provider: "p", model_id });
const tasks = ["texto", "codigo", "orquestador", "razonamiento", "imagen"];

describe("sharedWith", () => {
  it("dice con qué otras tareas de texto comparte el principal", () => {
    const draft: Draft = {
      texto: { default: e("a"), fallbacks: [] },
      codigo: { default: e("b"), fallbacks: [] },
      orquestador: { default: e("a"), fallbacks: [] },
      razonamiento: { default: { provider: "", model_id: "" }, fallbacks: [] },
      imagen: { default: e("a"), fallbacks: [] },
    };
    const shared = sharedWith(tasks, draft, { razonamiento: e("b") });
    expect(shared.texto).toEqual(["Orquestador"]);
    expect(shared.codigo).toEqual(["Razonamiento"]);
    expect(shared.imagen).toBeUndefined();
  });
});

describe("sharingSummary", () => {
  it("resume cuántos modelos distintos usan las tareas de texto", () => {
    const same: Draft = Object.fromEntries(
      ["texto", "codigo", "orquestador", "razonamiento"].map((t) => [
        t,
        { default: e("a"), fallbacks: [] },
      ]),
    );
    expect(sharingSummary(tasks, same, {})).toBe("Las 4 tareas de texto usan el mismo modelo");
    const mixed: Draft = { ...same, codigo: { default: e("b"), fallbacks: [] } };
    expect(sharingSummary(tasks, mixed, {})).toBe("Las tareas de texto usan 2 modelos distintos");
    expect(sharingSummary(tasks, {}, {})).toBeNull();
  });
});
