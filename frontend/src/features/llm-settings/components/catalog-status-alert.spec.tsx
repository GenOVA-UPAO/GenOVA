import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CatalogStatusAlert } from "./catalog-status-alert";
import { UnconnectedProvidersNote } from "./unconnected-providers-note";

const status = {
  openrouter: { ok: true, configured: true },
  groq: { ok: false, configured: false },
  opencode: { ok: false, configured: false },
};

describe("CatalogStatusAlert", () => {
  it("stays hidden when the only providers down are the ones without a key", () => {
    render(
      <CatalogStatusAlert catalogStatus={status} refreshing={false} canFixKeys onRetry={vi.fn()} />,
    );
    expect(screen.queryByText(/No pudimos obtener/)).toBeNull();
  });

  it("warns about a connected provider that did not answer and offers a retry", async () => {
    const onRetry = vi.fn();
    render(
      <CatalogStatusAlert
        catalogStatus={{ ...status, openrouter: { ok: false, configured: true } }}
        refreshing={false}
        canFixKeys={false}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByText("No pudimos obtener los modelos de OpenRouter")).toBeTruthy();
    expect(screen.queryByText(/Credenciales/)).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

describe("UnconnectedProvidersNote", () => {
  it("lists providers without a key and connects the first one", async () => {
    const onConnect = vi.fn();
    render(<UnconnectedProvidersNote catalogStatus={status} onConnect={onConnect} />);
    expect(screen.getByText("Sin conectar: Groq y OpenCode.")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Conectar proveedores" }));
    expect(onConnect).toHaveBeenCalledWith("groq");
  });

  it("names the provider when only one is missing", () => {
    render(
      <UnconnectedProvidersNote
        catalogStatus={{ groq: { ok: false, configured: false } }}
        onConnect={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Conectar Groq" })).toBeTruthy();
  });

  it("renders nothing when every provider has its key", () => {
    const { container } = render(
      <UnconnectedProvidersNote
        catalogStatus={{ groq: { ok: true, configured: true } }}
        onConnect={vi.fn()}
      />,
    );
    expect(container.textContent).toBe("");
  });
});
