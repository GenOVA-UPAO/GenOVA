import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { Draft } from "../lib/llm-config-draft";
import { ApplyModelDialog } from "./apply-model-dialog";

const e = (model_id: string) => ({ provider: "p", model_id });
const draft: Draft = {
  texto: { default: e("flash"), fallbacks: [e("v4")] },
  codigo: { default: e("codex"), fallbacks: [] },
  orquestador: { default: e("flash"), fallbacks: [] },
  imagen: { default: e("flux"), fallbacks: [] },
};
const models = [
  { provider: "p", model_id: "flash", label: "Flash" },
  { provider: "p", model_id: "codex", label: "Codex" },
  { provider: "p", model_id: "v4", label: "V4" },
];

describe("ApplyModelDialog", () => {
  it("muestra qué cambia y aplica solo a las tareas que cambian", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(
      <ApplyModelDialog
        source="texto"
        draft={draft}
        tasks={["texto", "codigo", "orquestador", "imagen"]}
        models={models}
        onApply={onApply}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: "Usar Flash en otras tareas" })).toBeTruthy();
    expect(screen.getByText("Ahora: Codex")).toBeTruthy();
    expect(screen.getByText("Ya usa este modelo.")).toBeTruthy();
    expect(screen.queryByText("Imagen")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Aplicar a 1 tarea" }));
    const [next, changed] = onApply.mock.calls[0] as [Draft, string[]];
    expect(changed).toEqual(["codigo"]);
    expect(next.codigo.default.model_id).toBe("flash");
    expect(next.codigo.fallbacks).toEqual([]);
  });

  it("copia también los respaldos si se marca", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(
      <ApplyModelDialog
        source="texto"
        draft={draft}
        tasks={["texto", "codigo", "orquestador"]}
        models={models}
        onApply={onApply}
        onClose={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("checkbox", { name: /Copiar también los respaldos/ }));
    await user.click(screen.getByRole("button", { name: "Aplicar a 2 tareas" }));
    const [next] = onApply.mock.calls[0] as [Draft];
    expect(next.orquestador.fallbacks.map((f) => f.model_id)).toEqual(["v4"]);
  });
});
