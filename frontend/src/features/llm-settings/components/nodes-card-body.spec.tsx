import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { useNodesConfig } from "../hooks/use-nodes-config";
import { CapabilitiesBody } from "./capabilities-body";
import { NodesCardBody } from "./nodes-card-body";

describe("cuerpos de la pestaña Plataforma ante un error de carga", () => {
  it("NodesCardBody muestra el error en vez de un esqueleto sin fin", () => {
    render(
      <NodesCardBody
        loading={false}
        error="boom"
        ready={false}
        configurable={[]}
        alwaysOn={[]}
        nodes={{} as ReturnType<typeof useNodesConfig>}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("boom");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("CapabilitiesBody muestra el error en vez de un esqueleto sin fin", () => {
    render(
      <CapabilitiesBody
        loading={false}
        error="boom"
        ready={false}
        capabilities={[]}
        draft={null}
        saving={false}
        mediaStatus={undefined}
        onToggle={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("boom");
    expect(screen.queryByRole("status")).toBeNull();
  });
});
