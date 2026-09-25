import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ModelTestResult } from "../api/model-tools.api";
import { ModelTestButton } from "./model-test-button";

const testModel = vi.fn<(p: string, m: string, admin: boolean) => Promise<ModelTestResult>>();
const auth = { admin: true };
const own = { providers: null as Set<string> | null };

vi.mock("../api/model-tools.api", () => ({
  testModel: (p: string, m: string, admin: boolean) => testModel(p, m, admin),
}));

vi.mock("@/core/auth/auth-store", () => ({ useIsAdmin: () => auth.admin }));

vi.mock("../hooks/use-own-key-providers", () => ({
  useOwnKeyProviders: () => own.providers,
  isAllowedProvider: (allowed: Set<string> | null, p: string) => allowed === null || allowed.has(p),
}));

const OK: ModelTestResult = {
  ok: true,
  code: "ok",
  provider: "openrouter",
  model_id: "deepseek/deepseek-v4.1-flash",
  latency_ms: 812,
  excerpt: "Listo.",
  key_source: "platform",
  simulated: false,
};

function renderButton(provider = "openrouter", modelId = "deepseek/deepseek-v4.1-flash") {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ModelTestButton provider={provider} modelId={modelId} />
    </QueryClientProvider>,
  );
}

describe("ModelTestButton", () => {
  beforeEach(() => {
    testModel.mockReset();
    auth.admin = true;
    own.providers = null;
  });

  it("prueba el modelo y enseña latencia, respuesta y con qué clave", async () => {
    testModel.mockResolvedValue(OK);
    renderButton();
    await userEvent.click(screen.getByRole("button", { name: /Probar el modelo deepseek/ }));
    expect(await screen.findByText("Responde en 812 ms")).toBeInTheDocument();
    expect(screen.getByText("Listo.")).toBeInTheDocument();
    expect(screen.getByText(/Con la clave de la plataforma/)).toBeInTheDocument();
    expect(testModel).toHaveBeenCalledWith("openrouter", "deepseek/deepseek-v4.1-flash", true);
  });

  it("si falla, dice qué pasó, qué hacer y deja volver a probar", async () => {
    testModel.mockResolvedValueOnce({ ...OK, ok: false, code: "invalid_key", excerpt: null });
    renderButton();
    await userEvent.click(screen.getByRole("button", { name: /Probar el modelo/ }));
    expect(await screen.findByText(/Clave no válida/)).toBeInTheDocument();
    expect(screen.getByText(/Cámbiala en Credenciales/)).toBeInTheDocument();
    testModel.mockResolvedValueOnce(OK);
    await userEvent.click(screen.getByRole("button", { name: "Probar otra vez" }));
    expect(await screen.findByText("Responde en 812 ms")).toBeInTheDocument();
  });

  it("enseña el error de la petición (límite de pruebas)", async () => {
    testModel.mockRejectedValue(new Error("Has hecho muchas pruebas seguidas. Espera 20 s."));
    renderButton();
    await userEvent.click(screen.getByRole("button", { name: /Probar el modelo/ }));
    expect(await screen.findByText(/muchas pruebas seguidas/)).toBeInTheDocument();
  });

  it("no aparece para modelos de imagen ni para proveedores sin clave propia", () => {
    const { container } = renderButton("runware", "sdxl");
    expect(container).toBeEmptyDOMElement();
    auth.admin = false;
    own.providers = new Set(["groq"]);
    renderButton("openrouter");
    expect(screen.queryByRole("button", { name: /Probar/ })).toBeNull();
  });

  it("«Probando…» ocupa el mismo hueco que «Probar»: el botón no cambia de ancho", async () => {
    testModel.mockReturnValue(new Promise<ModelTestResult>(() => undefined));
    renderButton();
    const button = screen.getByRole("button", { name: /Probar el modelo/ });
    const reserved = () => button.querySelector('[aria-hidden="true"].invisible')?.textContent;
    expect(reserved()).toBe("Probando…");
    await userEvent.click(button);
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveTextContent(/Probando…Probando…/);
    expect(reserved()).toBe("Probando…");
  });

  it("un usuario prueba con su clave", async () => {
    auth.admin = false;
    own.providers = new Set(["groq"]);
    testModel.mockResolvedValue({ ...OK, provider: "groq", key_source: "own" });
    renderButton("groq", "llama-3.1-8b-instant");
    await userEvent.click(screen.getByRole("button", { name: /Probar el modelo/ }));
    expect(await screen.findByText(/Con tu clave/)).toBeInTheDocument();
    expect(testModel).toHaveBeenCalledWith("groq", "llama-3.1-8b-instant", false);
  });
});
