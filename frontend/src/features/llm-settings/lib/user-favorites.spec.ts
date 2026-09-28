import type { SettingsMap } from "./llm-settings-mutations";
import { favoriteInUseBy, favoritesToAdd, userModelsInUse } from "./user-favorites";

const settings: SettingsMap = {
  texto: {
    provider: "groq",
    model_id: "llama",
    override: true,
    fallbacks: [{ provider: "groq", model_id: "qwen" }],
  },
  // Sigue a la plataforma: no cuenta como elección propia.
  codigo: { provider: "openrouter", model_id: "codex", override: false },
};

describe("userModelsInUse", () => {
  it("solo cuenta las tareas con elección propia", () => {
    expect(userModelsInUse(settings).map((m) => `${m.task}:${m.model_id}`)).toEqual([
      "texto:llama",
      "texto:qwen",
    ]);
    expect(userModelsInUse(null)).toEqual([]);
  });
});

describe("favoritesToAdd", () => {
  it("añade el elegido y los demás en uso de su proveedor", () => {
    const inUse = userModelsInUse(settings);
    expect(favoritesToAdd([], { provider: "groq", model_id: "gpt-oss" }, inUse)).toEqual([
      { provider: "groq", model_id: "gpt-oss" },
      { provider: "groq", model_id: "llama" },
      { provider: "groq", model_id: "qwen" },
    ]);
  });

  it("no repite los que ya son favoritos", () => {
    const enabled = [
      { provider: "groq", model_id: "llama" },
      { provider: "groq", model_id: "qwen" },
    ];
    expect(
      favoritesToAdd(enabled, { provider: "groq", model_id: "llama" }, userModelsInUse(settings)),
    ).toEqual([]);
  });

  it("no hace nada sin modelo", () => {
    expect(favoritesToAdd([], { provider: "", model_id: "" }, [])).toEqual([]);
  });
});

describe("favoriteInUseBy", () => {
  it("dice qué tarea lo usa", () => {
    expect(favoriteInUseBy(settings, { provider: "groq", model_id: "qwen" })).toBe("Texto");
    expect(favoriteInUseBy(settings, { provider: "openrouter", model_id: "codex" })).toBeNull();
  });
});
