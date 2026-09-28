import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { WorkspaceLoadError } from "./workspace-load-error";

function renderError(status: number) {
  render(
    <MemoryRouter>
      <WorkspaceLoadError status={status} message="Error del servidor" onRetry={vi.fn()} />
    </MemoryRouter>,
  );
}

describe("WorkspaceLoadError", () => {
  it("does not offer a retry when the OVA does not exist", () => {
    renderError(404);
    expect(screen.getByText("No encontramos este OVA")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver la papelera" })).toHaveAttribute(
      "href",
      "/papelera",
    );
  });

  it("offers a retry for transient failures", () => {
    renderError(500);
    expect(screen.getByText("Error del servidor")).toBeVisible();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeVisible();
  });
});
