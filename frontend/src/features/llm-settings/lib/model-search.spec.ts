import {
  filterOptions,
  hasFilters,
  type ModelOption,
  NO_FILTERS,
  type OptionContext,
  optionProviders,
  sectionOptions,
  toOption,
} from "./model-search";

type Extra = Partial<Parameters<typeof toOption>[0]> & { ctx?: OptionContext };

const opt = (provider: string, id: string, label: string, extra: Extra = {}): ModelOption => {
  const { ctx, ...rest } = extra;
  return toOption({ provider, model_id: id, label, ...rest }, `${provider}::${id}`, ctx);
};

describe("filterOptions", () => {
  const options = [
    opt("openrouter", "deepseek/deepseek-v4.1-flash", "DeepSeek: DeepSeek V4.1 Flash", {
      pricing_detail: { input: 0.14, output: 0.42 },
      modality: "text+image->text",
    }),
    opt("groq", "llama-3.3-70b", "Meta: Llama 3.3 70B", { pricing: "Gratuito" }),
    opt("openrouter", "qwen/qwen3-coder", "Qwen: Qwen3 Coder", {
      category: "codigo",
      pricing_detail: { input: 0.3, output: 1.5 },
    }),
  ];

  it("devuelve todo sin consulta ni filtros", () => {
    expect(filterOptions(options, "  ")).toHaveLength(3);
  });

  it("exige todas las palabras en nombre, id o proveedor", () => {
    expect(filterOptions(options, "flash deepseek").map((o) => o.name)).toEqual(["DeepSeek V4.1 Flash"]);
    expect(filterOptions(options, "groq")).toHaveLength(1);
    expect(filterOptions(options, "qwen3-coder")).toHaveLength(1);
  });

  it("filtra por gratis, económicos, capacidades y proveedor", () => {
    expect(filterOptions(options, "", { ...NO_FILTERS, free: true }).map((o) => o.provider)).toEqual(["groq"]);
    expect(filterOptions(options, "", { ...NO_FILTERS, cheap: true })).toHaveLength(2);
    expect(filterOptions(options, "", { ...NO_FILTERS, capabilities: ["vision"] })).toHaveLength(1);
    expect(filterOptions(options, "", { ...NO_FILTERS, capabilities: ["code"] })[0]?.name).toBe("Qwen3 Coder");
    expect(filterOptions(options, "", { ...NO_FILTERS, provider: "openrouter" })).toHaveLength(2);
  });

  it("sabe si hay algún filtro puesto", () => {
    expect(hasFilters(NO_FILTERS)).toBe(false);
    expect(hasFilters({ ...NO_FILTERS, provider: "groq" })).toBe(true);
  });
});

describe("sectionOptions", () => {
  it("agrupa en uso, favoritos, recomendados y el resto, con el elegido primero", () => {
    const options = [
      opt("p", "z", "Zeta"),
      opt("p", "fav", "Favorito", { ctx: { favorite: true } }),
      opt("p", "rec", "Recomendado", { curated: true }),
      opt("p", "used", "Usado", { ctx: { usage: ["Código / HTML"] } }),
      opt("p", "cur", "Actual"),
      opt("p", "a", "Alfa"),
    ];
    const sections = sectionOptions(options, "p::cur");
    expect(sections.map((s) => s.key)).toEqual(["in-use", "favorites", "recommended", "rest"]);
    expect(sections[0]?.options.map((o) => o.name)).toEqual(["Actual", "Usado"]);
    expect(sections[3]?.options.map((o) => o.name)).toEqual(["Alfa", "Zeta"]);
  });

  it("ordena el resto por precio de salida cuando se buscan baratos", () => {
    const options = [
      opt("p", "caro", "Caro", { pricing_detail: { input: 1, output: 9 } }),
      opt("p", "gratis", "Gratis", { pricing: "Gratuito" }),
      opt("p", "sin", "Sin precio"),
      opt("p", "medio", "Medio", { pricing_detail: { input: 0.1, output: 0.5 } }),
    ];
    const rest = sectionOptions(options, "", true)[0]?.options.map((o) => o.name);
    expect(rest).toEqual(["Gratis", "Medio", "Caro", "Sin precio"]);
  });

  it("omite los grupos vacíos", () => {
    expect(sectionOptions([opt("p", "a", "A")], "").map((s) => s.key)).toEqual(["rest"]);
  });
});

describe("toOption", () => {
  it("no repite el proveedor que ya se muestra aparte", () => {
    expect(toOption({ provider: "openrouter", model_id: "x", label: "DeepSeek V4 Flash (OpenRouter)" }, "v").name).toBe(
      "DeepSeek V4 Flash",
    );
  });

  it("lista los proveedores presentes sin repetir", () => {
    const options = [opt("groq", "a", "A"), opt("openrouter", "b", "B"), opt("groq", "c", "C")];
    expect(optionProviders(options)).toEqual([
      { id: "groq", label: "Groq" },
      { id: "openrouter", label: "OpenRouter" },
    ]);
  });
});
