import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { toResourceViewModel } from "../../lib/ova-job-view-model";
import { PreviewPanelBody } from "./preview-panel-body";
import { PreviewPanelTabs } from "./preview-panel-tabs";
import { ProgressPanel } from "./progress-panel";
import { TotalFailurePanel } from "./total-failure-panel";

vi.mock("@/core/auth/auth-store", () => ({ useIsAdmin: () => true }));
const resources = toResourceViewModel([
  { id: "r1", phase_type: "engage", phase_order: 1, resource_order: 0, title: "Cómic", status: "pending" },
  { id: "r2", phase_type: "explore", phase_order: 2, resource_order: 0, title: "Lectura", status: "canceled" },
]);

describe("QA generación", () => {
  it("anuncia en cola y cancelado igual que los estados visibles", () => {
    render(<PreviewPanelTabs done={[]} pending={resources} activeId={undefined} onSelect={vi.fn()} />);
    expect(screen.getByText("(En cola)")).toBeInTheDocument();
    expect(screen.getByText("(Cancelado)")).toBeInTheDocument();
    expect(screen.queryByText(/generando/i)).toBeNull();
  });
  it("el fallo total deja de prometer recursos en la vista previa", () => {
    render(<PreviewPanelBody active={undefined} loading={false} html="" failed />);
    expect(screen.getByText(/No hay recursos disponibles/)).toBeVisible();
    expect(screen.queryByText(/aparecerán aquí/)).toBeNull();
  });
  it("explica las credenciales de plataforma y enlaza al administrador", () => {
    render(<MemoryRouter><TotalFailurePanel viewModel={[{ ...resources[0], status: "X", error_code: "provider_auth" }]} onRetryAll={vi.fn()} /></MemoryRouter>);
    expect(screen.getByText(/Avisa al administrador/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Modelos → Credenciales" })).toHaveAttribute("href", "/models?tab=credentials");
  });
  it("con fallos en curso no estima minutos ni ofrece reintento concurrente", () => {
    const failed = [{ ...resources[0], status: "X" as const }];
    const noop = vi.fn();
    render(<ProgressPanel job={{ status: "running", eta: { seconds: 120, basis: "estimado" } }} viewModel={failed} selectedIds={[]} activeId={null} showCancel isStalled={false} resumableCount={0} resuming={false} onToggle={noop} onRetryOne={noop} onSelectAll={noop} onRetrySelected={noop} onCancel={noop} onResume={noop} />);
    expect(screen.queryByText(/min restante/)).toBeNull();
    expect(screen.queryByRole("button", { name: /Seleccionar todos/ })).toBeNull();
  });
});
