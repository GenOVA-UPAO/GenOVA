import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/core/components/icon", () => ({
  Icon: ({ name }: { name: string }) => <span data-icon={name} />,
}));

import type { useOvaJob } from "../../hooks/use-ova-job";
import type { ResourceVM } from "../../lib/ova-job-view-model";
import { GenerationProgressColumn } from "./generation-progress-column";

const failed: ResourceVM = {
  id: "r1",
  phase: "engage",
  phaseLabel: "Enganche",
  label: "Cómic Interactivo",
  emoji: "",
  status: "X",
  error_id: "err-1",
  selectable: true,
};

function jobStub(
  status: string,
  resources: ResourceVM[],
  outcome: ReturnType<typeof useOvaJob>["outcome"],
): ReturnType<typeof useOvaJob> {
  return {
    data: { status, resources: [] },
    resources,
    outcome,
    error: null,
    resume: { isPending: false },
  } as unknown as ReturnType<typeof useOvaJob>;
}

const noop = vi.fn();

function renderColumn(job: ReturnType<typeof useOvaJob>) {
  render(
    <GenerationProgressColumn
      job={job}
      stalled={false}
      selectedIds={[]}
      pinnedId={null}
      onToggle={noop}
      onSelectAll={noop}
      onRetryOne={noop}
      onRetrySelected={noop}
      onRetryAll={noop}
      onCancel={noop}
    />,
  );
}

describe("GenerationProgressColumn", () => {
  it("shows a calm canceled banner instead of total failure", () => {
    renderColumn(
      jobStub("canceled", [failed], { isTerminal: true, anyDone: false, totalFail: true }),
    );
    expect(screen.getByRole("status")).toHaveTextContent("se canceló a petición tuya");
    expect(screen.queryByText("No se pudo generar el OVA")).not.toBeInTheDocument();
  });

  it("shows the total failure panel when every resource failed", () => {
    renderColumn(jobStub("error", [failed], { isTerminal: true, anyDone: false, totalFail: true }));
    expect(screen.getByText("No se pudo generar el OVA")).toBeVisible();
    expect(screen.queryByText("se canceló a petición tuya")).not.toBeInTheDocument();
    // Con fallo total basta «Reintentar generación»: sin casillas ni reintento en bloque.
    expect(screen.getByRole("button", { name: "Reintentar generación" })).toBeVisible();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Seleccionar todos los fallidos" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("1 recurso no se pudo generar")).toBeVisible();
  });
});
