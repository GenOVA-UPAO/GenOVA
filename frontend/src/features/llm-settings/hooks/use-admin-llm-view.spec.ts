import { buildAdminView } from "./use-admin-llm-view";

const base = {
  isAdmin: false,
  loading: false,
  isError: false,
  raw: undefined,
  catalogFull: [],
  defaults: { texto: { provider: "openrouter", model_id: "semilla/fija" } },
};

describe("buildAdminView sin permisos de admin", () => {
  it("muestra la configuración efectiva de la plataforma, respaldos incluidos", () => {
    const view = buildAdminView({
      ...base,
      platform: {
        defaults: { texto: { provider: "openrouter", model_id: "admin/elegido" } },
        fallbacks: { texto: [{ provider: "openrouter", model_id: "admin/respaldo" }] },
      },
    });
    expect(view.draft?.texto.default.model_id).toBe("admin/elegido");
    expect(view.draft?.texto.fallbacks.map((f) => f.model_id)).toEqual(["admin/respaldo"]);
  });

  it("cae en la semilla si el backend no envía la plataforma", () => {
    const view = buildAdminView({ ...base, platform: null });
    expect(view.draft?.texto.default.model_id).toBe("semilla/fija");
  });
});
