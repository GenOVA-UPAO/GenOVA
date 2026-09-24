import {
  browseCatalog,
  catalogFiltered,
  catalogProviders,
  DEFAULT_CATALOG_FILTERS,
} from "./catalog-browse";
import type { CatalogModel } from "./user-llm-settings.types";

const models: CatalogModel[] = [
  {
    provider: "openrouter",
    model_id: "google/gemini",
    label: "Google: Gemini",
    description: "Workhorse model for reasoning",
    modality: "text+image->text",
    pricing_detail: { input: 0.3, output: 2.5 },
    context_length: 1_000_000,
    curated: true,
  },
  {
    provider: "groq",
    model_id: "llama",
    label: "Llama",
    pricing: "Gratuito",
    context_length: 128_000,
  },
  {
    provider: "openrouter",
    model_id: "deepseek/r1",
    label: "DeepSeek: R1",
    category: "razonamiento",
    pricing_detail: { input: 0.5, output: 2 },
    context_length: 64_000,
  },
  { provider: "openrouter", model_id: "auto", label: "Auto Router", pricing: "Variable" },
];

const none = () => false;

describe("browseCatalog", () => {
  it("busca también en la descripción y el proveedor", () => {
    expect(
      browseCatalog(models, { ...DEFAULT_CATALOG_FILTERS, query: "workhorse" }, none),
    ).toHaveLength(1);
    expect(
      browseCatalog(models, { ...DEFAULT_CATALOG_FILTERS, query: "groq" }, none)[0]?.model_id,
    ).toBe("llama");
  });

  it("combina filtros rápidos", () => {
    const f = DEFAULT_CATALOG_FILTERS;
    expect(browseCatalog(models, { ...f, free: true }, none).map((m) => m.model_id)).toEqual([
      "llama",
    ]);
    expect(
      browseCatalog(models, { ...f, capabilities: ["reasoning"] }, none).map((m) => m.model_id),
    ).toEqual(["deepseek/r1"]);
    expect(
      browseCatalog(models, { ...f, recommended: true, provider: "openrouter" }, none),
    ).toHaveLength(1);
    const fav = (m: CatalogModel) => m.model_id === "auto";
    expect(browseCatalog(models, { ...f, favorites: true }, fav).map((m) => m.model_id)).toEqual([
      "auto",
    ]);
  });

  it("por defecto pone lo que se usa, los favoritos y los recomendados primero", () => {
    const fav = (m: CatalogModel) => m.model_id === "llama";
    const used = (m: CatalogModel) => m.model_id === "deepseek/r1";
    expect(
      browseCatalog(models, DEFAULT_CATALOG_FILTERS, fav, used).map((m) => m.model_id),
    ).toEqual(["deepseek/r1", "llama", "google/gemini", "auto"]);
  });

  it("ordena por precio con el precio desconocido al final", () => {
    const sorted = browseCatalog(models, { ...DEFAULT_CATALOG_FILTERS, sort: "price-asc" }, none);
    expect(sorted.map((m) => m.model_id)).toEqual([
      "llama",
      "deepseek/r1",
      "google/gemini",
      "auto",
    ]);
    const desc = browseCatalog(models, { ...DEFAULT_CATALOG_FILTERS, sort: "price-desc" }, none);
    expect(desc.map((m) => m.model_id)).toEqual(["google/gemini", "deepseek/r1", "llama", "auto"]);
  });

  it("ordena por contexto", () => {
    const sorted = browseCatalog(
      models,
      { ...DEFAULT_CATALOG_FILTERS, sort: "context-desc" },
      none,
    );
    expect(sorted[0]?.model_id).toBe("google/gemini");
  });
});

describe("catalogFiltered y catalogProviders", () => {
  it("el orden no cuenta como filtro", () => {
    expect(catalogFiltered({ ...DEFAULT_CATALOG_FILTERS, sort: "price-asc" })).toBe(false);
    expect(catalogFiltered({ ...DEFAULT_CATALOG_FILTERS, query: "x" })).toBe(true);
  });

  it("lista los proveedores con su nombre", () => {
    expect(catalogProviders(models)).toEqual([
      { id: "groq", label: "Groq" },
      { id: "openrouter", label: "OpenRouter" },
    ]);
  });
});
