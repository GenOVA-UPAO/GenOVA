import { describe, expect, it } from "vitest";

import { dedupeCatalogMap, dedupeCatalogModels, dedupeCatalogPage } from "./dedupe-catalog";

const flash = {
  provider: "openrouter",
  model_id: "deepseek/deepseek-v4-flash",
  label: "DeepSeek V4 Flash (OpenRouter)",
};

const flashAsTexto = { ...flash, category: "texto" };

describe("dedupeCatalogModels", () => {
  it("conserva la primera aparición de cada pareja proveedor/modelo", () => {
    expect(dedupeCatalogModels([flash, flashAsTexto])).toEqual([flash]);
  });

  it("no elimina el mismo model_id en proveedores distintos", () => {
    const groq = { provider: "groq", model_id: flash.model_id };
    expect(dedupeCatalogModels([flash, groq])).toHaveLength(2);
  });
});

describe("dedupeCatalogMap", () => {
  it("deduplica las listas de cada proveedor sin tocar las claves", () => {
    const catalog = dedupeCatalogMap({
      openrouter: [flash, flashAsTexto, { provider: "openrouter", model_id: "otro" }],
      groq: [],
    });
    expect(catalog.openrouter).toEqual([flash, { provider: "openrouter", model_id: "otro" }]);
    expect(catalog.groq).toEqual([]);
  });
});

describe("dedupeCatalogPage", () => {
  it("deduplica catalog, catalog_all y catalog_full dejando el resto igual", () => {
    const page = dedupeCatalogPage({
      has_own_llm_key: true,
      catalog: { openrouter: [flash, flashAsTexto] },
      catalog_all: [flash, flashAsTexto],
      catalog_full: [flash, flashAsTexto],
      timeout_bounds: [30, 300],
    });

    expect(page.catalog?.openrouter).toEqual([flash]);
    expect(page.catalog_all).toEqual([flash]);
    expect(page.catalog_full).toEqual([flash]);
    expect(page.has_own_llm_key).toBe(true);
    expect(page.timeout_bounds).toEqual([30, 300]);
  });
});
