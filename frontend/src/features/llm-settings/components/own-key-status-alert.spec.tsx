import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { OwnKeyStatusAlert } from "./own-key-status-alert";
import { UserKeyRowHeader } from "./user-key-row-header";

describe("OwnKeyStatusAlert", () => {
  it("no aparece si las listas de sus claves respondieron", () => {
    const { container } = render(
      <OwnKeyStatusAlert
        status={{ groq: { state: "connected", models: 7 }, opencode: { state: "not_connected" } }}
        refreshing={false}
        onRetry={vi.fn()}
        onFixKey={vi.fn()}
      />,
    );
    expect(container.textContent).toBe("");
  });

  it("con la clave rechazada lleva a cambiarla, no a reintentar", async () => {
    const onFixKey = vi.fn();
    render(
      <OwnKeyStatusAlert
        status={{ groq: { state: "error", error: "invalid_key", models: 0 } }}
        refreshing={false}
        onRetry={vi.fn()}
        onFixKey={onFixKey}
      />,
    );
    expect(screen.getByText("No pudimos obtener tus modelos de Groq")).toBeTruthy();
    expect(screen.getByText(/rechazó tu clave/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Revisar clave de Groq" }));
    expect(onFixKey).toHaveBeenCalledWith("groq");
  });

  it("con un fallo pasajero ofrece reintentar", async () => {
    const onRetry = vi.fn();
    render(
      <OwnKeyStatusAlert
        status={{ opencode: { state: "error", error: "unreachable", models: 0 } }}
        refreshing={false}
        onRetry={onRetry}
        onFixKey={vi.fn()}
      />,
    );
    expect(screen.getByText(/no respondió/)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

describe("UserKeyRowHeader", () => {
  it("conectado dice cuántos modelos trae su clave", () => {
    render(<UserKeyRowHeader provider="groq" view={{ kind: "connected", models: 7 }} />);
    expect(screen.getByText("Conectado")).toBeTruthy();
    expect(screen.getByText("· 7 modelos")).toBeTruthy();
  });

  it("con la clave rechazada no dice «Conectado» y explica el motivo", () => {
    render(<UserKeyRowHeader provider="groq" view={{ kind: "error", code: "invalid_key" }} />);
    expect(screen.queryByText("Conectado")).toBeNull();
    expect(screen.getByText("Clave no válida")).toBeTruthy();
    expect(screen.getByText(/rechazó tu clave/)).toBeTruthy();
  });

  it("sin clave sigue sin conectar y recién guardada se está comprobando", () => {
    const { rerender } = render(<UserKeyRowHeader provider="groq" view={{ kind: "none" }} />);
    expect(screen.getByText("Sin conectar")).toBeTruthy();
    rerender(<UserKeyRowHeader provider="groq" view={{ kind: "checking" }} />);
    expect(screen.getByText("Comprobando la clave…")).toBeTruthy();
  });
});
