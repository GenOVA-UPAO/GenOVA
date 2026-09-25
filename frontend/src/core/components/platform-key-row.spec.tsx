import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PlatformKeyRow } from "./platform-key-row";
import type * as CheckModule from "./platform-provider-check";
import type { ProviderCheckResult } from "./platform-provider-check";

const mocks = vi.hoisted(() => ({
  check: vi.fn<(provider: string) => Promise<ProviderCheckResult>>(),
  save: vi.fn<(provider: string, key: string) => Promise<unknown>>(),
}));

vi.mock("./platform-provider-check", async (importOriginal) => {
  const actual: typeof CheckModule = await importOriginal();
  return {
    ...actual,
    checkPlatformProvider: (provider: string) => mocks.check(provider),
  };
});

vi.mock("@/core/services/platform-settings.api", () => ({
  savePlatformConfigKey: (provider: string, key: string) => mocks.save(provider, key),
}));

function renderRow(props: { maskedValue?: string; serverKey?: boolean } = {}) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ul>
        <PlatformKeyRow provider="groq" {...props} />
      </ul>
    </QueryClientProvider>,
  );
}

describe("PlatformKeyRow · probar conexión", () => {
  beforeEach(() => {
    mocks.check.mockReset();
    mocks.save.mockReset();
  });

  it("comprueba la clave guardada y dice cuántos modelos da", async () => {
    mocks.check.mockResolvedValue({ provider: "groq", code: "connected", models: 7 });
    renderRow({ maskedValue: "••••••••1234" });
    await userEvent.click(screen.getByRole("button", { name: "Probar conexión con Groq" }));
    // Junto al nombre y, para lectores de pantalla, en la región viva.
    expect(await screen.findAllByText("Conectado · 7 modelos")).toHaveLength(2);
    expect(screen.getByRole("status")).toHaveTextContent("Conectado · 7 modelos");
  });

  it("al guardar una clave la comprueba y, si no vale, dice qué hacer", async () => {
    mocks.save.mockResolvedValue({ platform_config: { groq: "••••••••5678" } });
    mocks.check.mockResolvedValue({ provider: "groq", code: "invalid_key", models: null });
    renderRow();
    expect(screen.queryByRole("button", { name: /Probar conexión/ })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Añadir clave de Groq" }));
    await userEvent.type(screen.getByLabelText("Nueva clave de Groq"), "gsk_nueva_clave_5678");
    await userEvent.click(screen.getByRole("button", { name: "Guardar clave" }));
    expect(mocks.save).toHaveBeenCalledWith("groq", "gsk_nueva_clave_5678");
    expect(await screen.findByText("Clave no válida")).toBeInTheDocument();
    expect(screen.getByText(/mal copiada, caducada o revocada/)).toBeInTheDocument();
    expect(mocks.check).toHaveBeenCalledWith("groq");
  });

  it("con la clave del servidor también se puede probar", async () => {
    mocks.check.mockResolvedValue({ provider: "groq", code: "unreachable", models: null });
    renderRow({ serverKey: true });
    await userEvent.click(screen.getByRole("button", { name: "Probar conexión con Groq" }));
    expect(await screen.findByText("Sin respuesta")).toBeInTheDocument();
  });
});
