import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WorkspacePanelToolbar } from "./workspace-panel-toolbar";

vi.mock("@/core/lib/use-llm-settings-modal", () => ({
  useLlmSettingsModal: () => ({ open: vi.fn() }),
}));
vi.mock("@/core/export/api/ova-export.api", () => ({ exportOva: vi.fn() }));

function renderToolbar(canExport?: boolean) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <WorkspacePanelToolbar ovaId="ova-1" canExport={canExport} />
    </QueryClientProvider>,
  );
  return screen.getByRole("button", { name: "Descargar SCORM 1.2" });
}

describe("WorkspacePanelToolbar", () => {
  it("permite descargar el SCORM por defecto", () => {
    expect(renderToolbar()).toBeEnabled();
  });

  it("desactiva la descarga con el OVA sin terminar y explica cómo arreglarlo", () => {
    const button = renderToolbar(false);
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("title", expect.stringContaining("recursos con error"));
  });
});
