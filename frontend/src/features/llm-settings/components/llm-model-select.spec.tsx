import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { LlmModelSelect } from "./llm-model-select";

const models = [
  {
    provider: "openrouter",
    model_id: "a/flash",
    label: "Flash",
    pricing_detail: { input: 0.1, output: 0.4 },
    context_length: 1_000_000,
  },
  { provider: "openrouter", model_id: "a/free", label: "Gratis Uno", pricing: "Gratuito" },
  {
    provider: "openrouter",
    model_id: "a/vision",
    label: "Visual",
    modality: "text+image->text",
    curated: true,
  },
  { provider: "groq", model_id: "llama", label: "Llama", pricing_detail: { input: 1, output: 3 } },
];

function renderSelect(onChange = vi.fn()) {
  render(
    <LlmModelSelect
      models={models}
      provider="openrouter"
      modelId="a/flash"
      usage={{ "groq::llama": ["Código / HTML"] }}
      ariaLabel="Modelo principal de Texto"
      onChange={onChange}
    />,
  );
  return onChange;
}

describe("LlmModelSelect", () => {
  beforeAll(() => {
    // jsdom no implementa scrollIntoView (la opción activa se lleva a la vista).
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("dice el modelo elegido en el nombre accesible y su precio", () => {
    renderSelect();
    const trigger = screen.getByRole("combobox", {
      name: /Modelo principal de Texto: Flash, OpenRouter/,
    });
    expect(trigger.textContent).toContain("$0.10 / $0.40");
  });

  it("agrupa en uso, recomendados y el resto, con precio y contexto", async () => {
    const user = userEvent.setup();
    renderSelect();
    await user.click(screen.getByRole("combobox", { name: /Modelo principal/ }));
    const groups = screen.getAllByRole("group").filter((g) => g.getAttribute("aria-labelledby"));
    expect(groups).toHaveLength(3);
    expect(groups[0].textContent).toMatch(/^En uso ahora2/);
    expect(groups[1].textContent).toMatch(/^Recomendados1/);
    expect(groups[2].textContent).toMatch(/^Todos los modelos1/);
    const used = within(groups[0]).getAllByRole("option");
    expect(used[0].getAttribute("aria-selected")).toBe("true");
    expect(used[1].getAttribute("aria-label")).toContain("en uso en Código / HTML");
    expect(
      screen.getByRole("option", { name: /Flash, OpenRouter, Entrada \$0.10, salida \$0.40/ }),
    ).toBeTruthy();
  });

  it("filtra con los filtros rápidos y elige con el teclado", async () => {
    const user = userEvent.setup();
    const onChange = renderSelect();
    await user.click(screen.getByRole("combobox", { name: /Modelo principal/ }));
    await user.click(screen.getByRole("button", { name: "Gratis" }));
    expect(screen.getAllByRole("option")).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Gratis" }));
    const search = screen.getByRole("combobox", { name: /Buscar/ });
    await user.type(search, "llama");
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith({ provider: "groq", modelId: "llama" });
  });

  it("explica por qué no hay resultados y deja quitar los filtros", async () => {
    const user = userEvent.setup();
    renderSelect();
    await user.click(screen.getByRole("combobox", { name: /Modelo principal/ }));
    await user.type(screen.getByRole("combobox", { name: /Buscar/ }), "nada-parecido");
    expect(screen.getByRole("status").textContent).toContain(
      "Ningún modelo coincide con «nada-parecido»",
    );
    await user.click(screen.getByRole("button", { name: "Quitar filtros" }));
    expect(screen.getAllByRole("option")).toHaveLength(4);
  });
});
