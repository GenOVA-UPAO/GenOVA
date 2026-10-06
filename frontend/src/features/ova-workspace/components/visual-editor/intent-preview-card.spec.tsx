import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { IntentPreviewCard } from "./intent-preview-card";

describe("IntentPreviewCard", () => {
  it("deja la jerga técnica dentro de «Detalles técnicos» y redondea los milisegundos", () => {
    render(
      <IntentPreviewCard
        intent={{ accion: "mover", bloque: { tipo: "question", indice: 1 }, confianza: 0.9, razon: "Híbrido: Laya + Reglas (acción: mover)" }}
        trace={{ backend: "hybrid", elapsedMs: 16.92366600036621 }}
        canUndo={false}
        onUndo={vi.fn()}
      />,
    );
    const details = screen.getByText("Detalles técnicos").closest("details");
    expect(details).not.toBeNull();
    expect(details).not.toHaveAttribute("open");
    expect(details).toHaveTextContent("HYBRID • 17 ms");
    expect(screen.queryByText(/16\.92/)).not.toBeInTheDocument();
  });
});
