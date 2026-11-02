import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import type * as workspaceApi from "../../api/ova-workspace.api";
import type { PhaseWithContent } from "../../lib/types";
import { WorkspaceResourceList } from "./workspace-resource-list";

vi.mock("../../api/ova-workspace.api", async (original) => ({
  ...(await original<typeof workspaceApi>()),
  fetchOvaWorkspace: vi.fn(() => Promise.resolve({ title: "OVA" })),
}));

const version = (suffix: string): PhaseWithContent[] => [
  { id: `a${suffix}`, phase_type: "engage", phase_order: 0, title: "Primer recurso", content: "<p>1</p>" },
  { id: `b${suffix}`, phase_type: "engage", phase_order: 1, title: "Segundo recurso", content: "<p>2</p>" },
];

function list(phases: PhaseWithContent[]): ReactNode {
  return (
    <WorkspaceResourceList
      phases={phases}
      phaseType="engage"
      ovaId="ova-1"
      busy={false}
      onReorder={vi.fn()}
      onRegenerate={vi.fn()}
      onAdded={vi.fn()}
    />
  );
}

describe("WorkspaceResourceList", () => {
  it("keeps open editors and unsaved HTML when a new version renames every phase", () => {
    const client = new QueryClient();
    const wrap = (node: ReactNode) => <QueryClientProvider client={client}>{node}</QueryClientProvider>;
    const { rerender } = render(wrap(list(version("1"))));
    for (const button of screen.getAllByRole("button", { name: "Editar código HTML" })) fireEvent.click(button);
    fireEvent.change(screen.getAllByLabelText("Código HTML del recurso")[1], {
      target: { value: "<p>Borrador</p>" },
    });
    // Tras guardar otro recurso, el refetch trae la versión nueva: mismos
    // recursos y posiciones, ids nuevos.
    rerender(wrap(list(version("2"))));
    const editors = screen.getAllByLabelText("Código HTML del recurso");
    expect(editors).toHaveLength(2);
    expect(editors[1]).toHaveValue("<p>Borrador</p>");
  });
});
