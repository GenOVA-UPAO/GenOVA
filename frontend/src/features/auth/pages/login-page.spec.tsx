import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { authApi } from "@/core/auth/auth.service";
import { authStore } from "@/core/auth/auth-store";

import { LoginPage } from "./login-page";

vi.mock("@/core/auth/auth.service", () => ({
  authApi: {
    login: vi.fn(),
    verifyTotpLogin: vi.fn(),
    register: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock("@/core/auth/auth-store", () => ({
  authStore: { revalidate: vi.fn() },
}));

function renderLogin(search = "") {
  return render(
    <MemoryRouter initialEntries={[`/login${search}`]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<p>Dashboard</p>} />
        <Route path="/forgot-password" element={<p>Forgot</p>} />
        <Route path="/register" element={<p>Register</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.mocked(authApi).login.mockReset();
    vi.mocked(authApi).verifyTotpLogin.mockReset();
    vi.mocked(authStore).revalidate.mockReset();
    vi.mocked(authStore).revalidate.mockResolvedValue(null);
  });

  it("no muestra errores ni aria-invalid al cargar", () => {
    renderLogin();
    expect(screen.queryByText("Ingresa un correo con formato válido.")).not.toBeInTheDocument();
    expect(screen.queryByText("La contraseña es requerida.")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Correo")).not.toHaveAttribute("aria-invalid");
    expect(screen.getByLabelText("Contraseña")).not.toHaveAttribute("aria-invalid");
    expect(screen.getByRole("checkbox", { name: "Recordar sesión" })).toBeInTheDocument();
  });

  it("muestra el error de correo solo después de tocar el campo", async () => {
    const user = userEvent.setup();
    renderLogin();
    const email = screen.getByLabelText("Correo");
    await user.click(email);
    await user.tab();
    expect(screen.getByText("Ingresa un correo con formato válido.")).toBeVisible();
    expect(email).toHaveAttribute("aria-invalid", "true");
  });

  it("pide TOTP cuando el login lo requiere y entra al verificar el código", async () => {
    const user = userEvent.setup();
    vi.mocked(authApi).login.mockResolvedValue({
      status: 200,
      data: { totp_required: true, ticket: "ticket-1" },
    });
    vi.mocked(authApi).verifyTotpLogin.mockResolvedValue({ ok: true, data: {} });
    renderLogin();
    await user.type(screen.getByLabelText("Correo"), "user@genova.ai");
    await user.type(screen.getByLabelText("Contraseña"), "user1234password");
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByRole("heading", { name: "Código de autenticación" })).toBeVisible();
    await user.type(screen.getByLabelText("Código"), "123456");
    await user.click(screen.getByRole("button", { name: "Verificar" }));
    expect(await screen.findByText("Dashboard")).toBeVisible();
    expect(vi.mocked(authStore).revalidate.mock.calls).toHaveLength(1);
    expect(vi.mocked(authApi).verifyTotpLogin.mock.calls).toEqual([["ticket-1", "123456"]]);
  });

  it("muestra aviso si la sesión expiró", () => {
    renderLogin("?expired=1");
    expect(screen.getByText("Tu sesión ha expirado. Vuelve a iniciar sesión.")).toBeVisible();
  });
});
