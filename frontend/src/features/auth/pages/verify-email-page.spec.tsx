import { render, screen } from "@testing-library/react";
import i18n from "i18next";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { verifyEmail } from "../services/verification";
import { VerifyEmailPage } from "./verify-email-page";

vi.mock("../services/verification", () => ({ verifyEmail: vi.fn() }));
const revalidate = vi.hoisted(() => vi.fn());
vi.mock("@/core/auth/auth-store", () => ({ authStore: { revalidate } }));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/verify-email?token=abc"]}>
      <VerifyEmailPage />
    </MemoryRouter>,
  );
}

describe("VerifyEmailPage", () => {
  beforeEach(() => {
    vi.mocked(verifyEmail).mockReset();
    revalidate.mockReset();
  });

  it("si /me falla tras verificar, sigue mostrando el éxito", async () => {
    vi.mocked(verifyEmail).mockResolvedValue({});
    revalidate.mockRejectedValue(new Error("auth/me: unexpected status 503"));

    renderPage();

    expect(
      await screen.findByRole("heading", { name: i18n.t("auth:verify.successTitle") }),
    ).toBeInTheDocument();
    expect(screen.queryByText("auth/me: unexpected status 503")).toBeNull();
  });

  it("si el token no es válido muestra el error", async () => {
    vi.mocked(verifyEmail).mockRejectedValue(new Error("El enlace ha expirado."));

    renderPage();

    expect(
      await screen.findByRole("heading", { name: i18n.t("auth:verify.errorTitle") }),
    ).toBeInTheDocument();
    expect(revalidate).not.toHaveBeenCalled();
  });
});
