import {
  findModel,
  formatContext,
  formatUsd,
  isCheap,
  modelFacts,
  priceDescription,
  priceSummary,
  shortDescription,
} from "./model-facts";

describe("modelFacts", () => {
  it("lee precio, contexto y capacidades del catálogo", () => {
    const facts = modelFacts({
      provider: "openrouter",
      model_id: "x",
      pricing: "$0.30/$2.50 por 1M tokens",
      pricing_detail: { input: 0.3, output: 2.5 },
      context_length: 1_048_576,
      modality: "text+image+file->text",
      category: "razonamiento",
      curated: true,
    });
    expect(facts).toMatchObject({
      free: false,
      variable: false,
      input: 0.3,
      output: 2.5,
      context: 1_048_576,
    });
    expect(facts.capabilities).toEqual(["vision", "reasoning"]);
    expect(facts.recommended).toBe(true);
  });

  it("reconoce gratis por la etiqueta o por precio cero, y variable", () => {
    expect(modelFacts({ provider: "p", model_id: "a", pricing: "Gratuito" }).free).toBe(true);
    expect(
      modelFacts({ provider: "p", model_id: "b", pricing_detail: { input: 0, output: 0 } }).free,
    ).toBe(true);
    expect(
      modelFacts({ provider: "p", model_id: "c", pricing: "Variable", pricing_detail: null })
        .variable,
    ).toBe(true);
  });

  it("los de Groq y HuggingFace sin precio cuentan como plan gratuito", () => {
    expect(
      modelFacts({ provider: "groq", model_id: "llama", pricing: null, pricing_detail: null }).free,
    ).toBe(true);
    expect(
      modelFacts({ provider: "groq", model_id: "x", pricing_detail: { input: 0.5, output: 1 } })
        .free,
    ).toBe(false);
  });

  it("no inventa datos que no hay", () => {
    const facts = modelFacts({ provider: "p", model_id: "d" });
    expect(facts).toMatchObject({ input: null, output: null, context: null, capabilities: [] });
    expect(priceSummary(facts)).toBeNull();
    expect(priceDescription(facts)).toBe("Precio no disponible");
  });

  it("cuenta como económico lo gratis y lo que sale a $1 o menos", () => {
    expect(isCheap(modelFacts({ provider: "p", model_id: "a", pricing: "Gratuito" }))).toBe(true);
    expect(
      isCheap(
        modelFacts({ provider: "p", model_id: "b", pricing_detail: { input: 0.2, output: 1 } }),
      ),
    ).toBe(true);
    expect(
      isCheap(
        modelFacts({ provider: "p", model_id: "c", pricing_detail: { input: 0.2, output: 1.2 } }),
      ),
    ).toBe(false);
  });
});

describe("formatos", () => {
  it("formatea dólares sin ceros de más y sin perder los muy bajos", () => {
    expect(formatUsd(0)).toBe("$0");
    expect(formatUsd(0.0886)).toBe("$0.09");
    expect(formatUsd(2.5)).toBe("$2.50");
    expect(formatUsd(15)).toBe("$15.00");
    expect(formatUsd(0.0042)).toBe("$0.0042");
  });

  it("formatea el contexto corto", () => {
    expect(formatContext(163_840)).toBe("164k");
    expect(formatContext(1_048_576)).toBe("1M");
    expect(formatContext(2_000_000)).toBe("2M");
    expect(formatContext(1_500_000)).toBe("1.5M");
    expect(formatContext(null)).toBeNull();
  });

  it("resume y describe el precio", () => {
    const facts = modelFacts({
      provider: "p",
      model_id: "x",
      pricing_detail: { input: 0.09, output: 0.18 },
    });
    expect(priceSummary(facts)).toBe("$0.09 / $0.18");
    expect(priceDescription(facts)).toBe("Entrada $0.09, salida $0.18 por millón de tokens");
  });
});

describe("shortDescription", () => {
  it("se queda con la primera frase", () => {
    expect(
      shortDescription("Gemini 2.5 Flash is a workhorse model. It is designed for speed."),
    ).toBe("Gemini 2.5 Flash is a workhorse model.");
  });

  it("no corta por los puntos de las versiones", () => {
    expect(shortDescription("DeepSeek-V3.1 is a large hybrid model. More text.")).toBe(
      "DeepSeek-V3.1 is a large hybrid model.",
    );
  });

  it("no corta en abreviaturas como «a.k.a.» o «e.g.»", () => {
    expect(
      shortDescription('Gemini 2.5 Flash Image, a.k.a. "Nano Banana," is now available. More.'),
    ).toBe('Gemini 2.5 Flash Image, a.k.a. "Nano Banana," is now available.');
    expect(shortDescription("Good for many tasks, e.g. code and math. More.")).toBe(
      "Good for many tasks, e.g. code and math.",
    );
  });

  it("corta en una palabra y marca el recorte", () => {
    const text = `${"word ".repeat(60)}end`;
    const out = shortDescription(text, 50);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(51);
    expect(out).not.toMatch(/wor…$/);
  });

  it("devuelve vacío sin descripción", () => {
    expect(shortDescription(null)).toBe("");
  });
});

describe("findModel", () => {
  it("devuelve el del catálogo o lo mínimo para nombrarlo", () => {
    const models = [{ provider: "p", model_id: "a", label: "A" }];
    expect(findModel(models, "p", "a").label).toBe("A");
    expect(findModel(models, "p", "b")).toEqual({ provider: "p", model_id: "b" });
  });
});
