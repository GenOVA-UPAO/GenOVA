import { overridesPayload, resetTipoIn, setModelIn, setTimeoutIn } from "./llm-settings-mutations";

const server = {
  texto: { provider: "openrouter", model_id: "admin/texto", timeout_s: 120, fallbacks: [], override: false },
  codigo: { provider: "openrouter", model_id: "mio/codigo", timeout_s: 90, fallbacks: [], override: true },
};

describe("elecciones propias de modelo", () => {
  it("al guardar solo se envían las tareas con elección propia", () => {
    expect(overridesPayload(server)).toEqual({
      codigo: { provider: "openrouter", model_id: "mio/codigo", timeout_s: 90, fallbacks: [] },
    });
  });

  it("elegir modelo o cambiar el tiempo convierte la tarea en elección propia", () => {
    expect(setModelIn(server, "texto", "groq", "llama").texto.override).toBe(true);
    expect(setTimeoutIn(server, "texto", 60).texto.override).toBe(true);
  });

  it("«Usar el de la plataforma» vuelve al modelo del admin y deja de enviarse", () => {
    const reset = resetTipoIn(server, "codigo", { codigo: { provider: "openrouter", model_id: "admin/codigo" } }, 120);
    expect(reset.codigo).toMatchObject({ model_id: "admin/codigo", override: false, fallbacks: [] });
    expect(overridesPayload(reset)).toEqual({});
  });
});
