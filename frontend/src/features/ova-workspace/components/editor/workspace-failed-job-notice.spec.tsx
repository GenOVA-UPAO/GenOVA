import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as jobsApi from "../../api/ova-jobs.api";
import type { JobSnapshot } from "../../lib/ova-job-view-model";
import { WorkspaceFailedJobNotice } from "./workspace-failed-job-notice";

vi.mock("@/core/components/icon", () => ({
  Icon: ({ name }: { name: string }) => <span data-icon={name} />,
}));
vi.mock("../../api/ova-jobs.api", () => ({ fetchOvaJobByOvaId: vi.fn() }));

function job(statuses: string[], status = "done"): JobSnapshot {
  return {
    job_id: "job-1",
    ova_id: "ova-1",
    status,
    resources: statuses.map((s, i) => ({
      id: `r${String(i)}`,
      phase_type: "engage",
      phase_order: i,
      resource_order: 0,
      status: s,
    })),
  };
}

function renderNotice() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <WorkspaceFailedJobNotice ovaId="ova-1" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("WorkspaceFailedJobNotice", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(jobsApi.fetchOvaJobByOvaId).mockReset();
  });

  it("avisa de los recursos fallidos y enlaza al progreso para reintentar", async () => {
    vi.mocked(jobsApi.fetchOvaJobByOvaId).mockResolvedValue(job(["done", "error"]));
    renderNotice();
    expect(await screen.findByRole("note")).toHaveTextContent("1 recurso no se pudo generar.");
    expect(screen.getByRole("link", { name: "Revisar y reintentar" })).toHaveAttribute(
      "href",
      "/crear?jobId=job-1",
    );
  });

  it("no avisa si todo se generó", async () => {
    vi.mocked(jobsApi.fetchOvaJobByOvaId).mockResolvedValue(job(["done", "done"]));
    renderNotice();
    await waitFor(() => {
      expect(jobsApi.fetchOvaJobByOvaId).toHaveBeenCalled();
    });
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("no avisa si el OVA no tiene generación", async () => {
    vi.mocked(jobsApi.fetchOvaJobByOvaId).mockRejectedValue(new Error("No hay generación"));
    renderNotice();
    await waitFor(() => {
      expect(jobsApi.fetchOvaJobByOvaId).toHaveBeenCalled();
    });
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("recuerda que se descartó para ese job", async () => {
    vi.mocked(jobsApi.fetchOvaJobByOvaId).mockResolvedValue(job(["error", "degraded", "done"]));
    renderNotice();
    expect(await screen.findByRole("note")).toHaveTextContent("2 recursos no se pudieron generar.");
    fireEvent.click(screen.getByRole("button", { name: "Descartar aviso" }));
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    expect(localStorage.getItem("genova:failed-job-notice-dismissed:job-1")).toBe("1");
  });
});
