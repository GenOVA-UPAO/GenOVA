import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/core/components/icon", () => ({
  Icon: ({ name }: { name: string }) => <span data-icon={name} />,
}));

import type { useOvaJob } from "../../hooks/use-ova-job";
import {
  type BackendResource,
  jobOutcome,
  type JobSnapshot,
  toResourceViewModel,
} from "../../lib/ova-job-view-model";
import { CreationProgress } from "./creation-progress";

const resumeMutate = vi.fn();
let snapshot: JobSnapshot = {};

vi.mock("../../hooks/use-ova-job", () => ({
  useOvaJob: (): ReturnType<typeof useOvaJob> => {
    const resources = toResourceViewModel(snapshot.resources);
    return {
      data: snapshot,
      resources,
      outcome: jobOutcome(snapshot, resources),
      error: null,
      isStreaming: false,
      resume: { isPending: false, error: null, mutate: resumeMutate },
      cancel: { isPending: false, error: null, mutate: vi.fn() },
    } as unknown as ReturnType<typeof useOvaJob>;
  },
}));

function resource(id: string, phase: string, status: string, order: number): BackendResource {
  return {
    id,
    phase_type: phase,
    phase_order: order,
    resource_order: 0,
    title: phase === "engage" ? "Cómic Interactivo" : "Lectura Interactiva",
    status,
    error_id: status === "error" ? "8a06" : null,
  };
}

function renderProgress() {
  render(
    <MemoryRouter initialEntries={["/crear?jobId=job-1"]}>
      <Routes>
        <Route path="/crear" element={<CreationProgress jobId="job-1" />} />
        <Route path="/workspace/:id" element={<p>Editor del OVA</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CreationProgress", () => {
  beforeEach(() => {
    resumeMutate.mockClear();
  });

  it("abre el editor en cuanto el job termina sin fallos", async () => {
    snapshot = {
      job_id: "job-1",
      ova_id: "ova-1",
      status: "done",
      resources: [resource("r1", "engage", "done", 0), resource("r2", "explore", "done", 1)],
    };
    renderProgress();
    expect(await screen.findByText("Editor del OVA")).toBeVisible();
  });

  it("con algún recurso fallido se queda en el progreso y ofrece reintentar", () => {
    snapshot = {
      job_id: "job-1",
      ova_id: "ova-1",
      status: "done",
      resources: [resource("r1", "engage", "done", 0), resource("r2", "explore", "error", 1)],
    };
    renderProgress();
    expect(screen.queryByText("Editor del OVA")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "OVA generado con errores",
    );
    expect(screen.getByText(/1 de 2 recursos no se pudo generar/)).toBeVisible();
    // El error_id del recurso fallido sigue a la vista para poder reportarlo.
    expect(screen.getByText(/8a06/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reintentar fallidos" }));
    expect(resumeMutate).toHaveBeenCalledWith(["r2"]);

    expect(screen.getByRole("link", { name: "Abrir OVA de todos modos" })).toHaveAttribute(
      "href",
      "/workspace/ova-1",
    );
  });

  it("un recurso degradado también cuenta como fallido", () => {
    snapshot = {
      job_id: "job-1",
      ova_id: "ova-1",
      status: "done",
      resources: [resource("r1", "engage", "done", 0), resource("r2", "explore", "degraded", 1)],
    };
    renderProgress();
    expect(screen.queryByText("Editor del OVA")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar fallidos" })).toBeVisible();
  });
});
