import { filterOptions, MAX_VISIBLE_OPTIONS, type ModelOption, toOption } from "./model-search";

const opt = (provider: string, id: string, label: string): ModelOption =>
  toOption({ provider, model_id: id, label }, `${provider}::${id}`);

describe("filterOptions", () => {
  const options = [
    opt("openrouter", "deepseek/deepseek-v4.1-flash", "DeepSeek: DeepSeek V4.1 Flash"),
    opt("groq", "llama-3.3-70b", "Meta: Llama 3.3 70B"),
    opt("openrouter", "qwen/qwen3-coder", "Qwen: Qwen3 Coder"),
  ];

  it("devuelve todo sin consulta", () => {
    expect(filterOptions(options, "  ").total).toBe(3);
  });

  it("exige todas las palabras en nombre, id o proveedor", () => {
    expect(filterOptions(options, "flash deepseek").visible.map((o) => o.name)).toEqual([
      "DeepSeek V4.1 Flash",
    ]);
    expect(filterOptions(options, "groq").visible).toHaveLength(1);
  });

  it("limita lo que se pinta pero informa del total", () => {
    const many = Array.from({ length: 200 }, (_, i) => opt("openrouter", `m${String(i)}`, `M ${String(i)}`));
    const result = filterOptions(many, "");
    expect(result.visible).toHaveLength(MAX_VISIBLE_OPTIONS);
    expect(result.total).toBe(200);
  });
});
