import { modelDisplayName } from "./model-name";

describe("modelDisplayName", () => {
  it("quita el fabricante cuando el nombre lo repite", () => {
    expect(modelDisplayName("DeepSeek: DeepSeek V4.1 Flash", "x")).toBe("DeepSeek V4.1 Flash");
    expect(modelDisplayName("Qwen: qwen3-coder", "x")).toBe("qwen3-coder");
  });

  it("conserva el prefijo cuando aporta información", () => {
    expect(modelDisplayName("Meta: Llama 3.3 70B Instruct", "x")).toBe("Meta: Llama 3.3 70B Instruct");
  });

  it("usa el id cuando no hay etiqueta", () => {
    expect(modelDisplayName(undefined, "deepseek/deepseek-v4.1-flash")).toBe(
      "deepseek/deepseek-v4.1-flash",
    );
    expect(modelDisplayName("  ", "gpt-x")).toBe("gpt-x");
  });
});
