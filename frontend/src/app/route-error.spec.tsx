import { render, screen } from "@testing-library/react";
import i18n from "i18next";
import type * as reactRouter from "react-router";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const route = vi.hoisted((): { error: unknown } => ({ error: null }));
const captureException = vi.hoisted(() => vi.fn());

vi.mock("react-router", async (original) => ({
  ...(await original<typeof reactRouter>()),
  useRouteError: () => route.error,
}));
vi.mock("@/core/lib/observability/sentry", () => ({ captureException }));

import { RouteError } from "./route-error";

function renderWith(error: unknown) {
  route.error = error;
  render(
    <MemoryRouter>
      <RouteError />
    </MemoryRouter>,
  );
}

describe("RouteError ante chunks viejos tras un deploy", () => {
  beforeEach(() => {
    captureException.mockReset();
  });

  it.each([
    new TypeError("error loading dynamically imported module: https://x/assets/a.js"),
    new Error("Unable to preload CSS for /assets/a.css"),
    new TypeError("Failed to fetch dynamically imported module: https://x/assets/a.js"),
  ])("ofrece recargar la versión nueva ($message)", (error) => {
    renderWith(error);

    expect(
      screen.getByRole("heading", { name: i18n.t("shell:hay_una_version_nueva") }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: i18n.t("shell:volver_al_inicio") })).toBeNull();
    expect(captureException).not.toHaveBeenCalled();
  });

  it("un error cualquiera muestra el aviso genérico y se reporta", () => {
    const error = new Error("boom");
    renderWith(error);

    expect(
      screen.getByRole("heading", { name: i18n.t("shell:algo_salio_mal") }),
    ).toBeInTheDocument();
    expect(captureException).toHaveBeenCalledWith(error);
  });
});
