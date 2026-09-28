import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { CatalogModel } from "../lib/user-llm-settings.types";
import { ManageModelRow } from "./manage-model-row";

function renderRow(model: Partial<CatalogModel>) {
  render(
    <ul>
      <ManageModelRow
        model={{ provider: "openrouter", model_id: "x/y", label: "Modelo", ...model }}
        base={false}
        favorite={false}
        usage={[]}
        onToggle={vi.fn()}
      />
    </ul>,
  );
}

describe("ManageModelRow", () => {
  it("en móvil da el precio de texto por millón de tokens", () => {
    renderRow({ pricing_detail: { input: 0.15, output: 0.6 } });
    expect(screen.getByText("$0.15 / $0.60 por 1M tokens")).toBeInTheDocument();
  });

  it("no añade «por 1M tokens» al precio por imagen", () => {
    renderRow({
      modality: "text->image",
      media_pricing: { unit: "image", usd: 0.04, from: false, estimate_usd: null },
    });
    expect(screen.getAllByText("$0.04/imagen").length).toBeGreaterThan(0);
    expect(screen.queryByText(/por 1M tokens/)).toBeNull();
  });
});
