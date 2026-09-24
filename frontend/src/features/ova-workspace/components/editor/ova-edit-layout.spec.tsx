import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import type { ChatRegeneration } from "../../hooks/use-chat-regeneration";
import { OvaEditLayout } from "./ova-edit-layout";

vi.mock("./workspace-panel-toolbar", () => ({ WorkspacePanelToolbar: () => null }));
vi.mock("./workspace-chat-panel", () => ({
  WorkspaceChatPanel: () => "Panel de instrucciones",
}));
vi.mock("./workspace-ova-panel", () => ({
  WorkspaceOvaPanel: ({ readOnly }: { readOnly?: boolean }) =>
    readOnly ? "OVA en lectura" : "OVA editable",
}));

function renderLayout(readOnly: boolean) {
  render(
    <MemoryRouter>
      <OvaEditLayout
        ovaId="ova-1"
        title="Ley de Ohm"
        version={2}
        readOnly={readOnly}
        phases={[]}
        regen={{} as ChatRegeneration}
      />
    </MemoryRouter>,
  );
}

describe("OvaEditLayout", () => {
  it("al autor le muestra instrucciones y el OVA editable", () => {
    renderLayout(false);
    expect(screen.getByText("Panel de instrucciones")).toBeInTheDocument();
    expect(screen.getByText("OVA editable")).toBeInTheDocument();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("a quien no es el autor le muestra solo el OVA y explica por qué", () => {
    renderLayout(true);
    expect(screen.getByRole("note")).toHaveTextContent("Solo quien creó este OVA puede modificarlo");
    expect(screen.getByText("OVA en lectura")).toBeInTheDocument();
    expect(screen.queryByText("Panel de instrucciones")).not.toBeInTheDocument();
    expect(screen.queryByRole("tablist", { name: "Vista del workspace" })).not.toBeInTheDocument();
  });
});
