import { describe, expect, it } from "vitest";

import type { BackendResource } from "./ova-job-view-model";
import { isResumableJob, mapResourceStatus, resumableResourceIds } from "./ova-job-view-model";

const RES = (status: string): BackendResource => ({
  id: `r-${status}`,
  phase_type: "engage",
  phase_order: 0,
  resource_order: 0,
  status,
});

describe("isResumableJob", () => {
  it("un job interrumpido con recursos pendientes es reanudable", () => {
    const job = { status: "interrupted" };
    const resources = [RES("done"), RES("pending"), RES("pending")] as BackendResource[];
    expect(isResumableJob(job, resources)).toBe(true);
  });

  it("los recursos en error también son reanudables", () => {
    const resources = [RES("error")] as BackendResource[];
    expect(isResumableJob({ status: "interrupted" }, resources)).toBe(true);
  });

  it("sin recursos pendientes ni en error, no se ofrece reanudar", () => {
    // El backend respondería resumed=0/accepted=false: el botón no haría nada.
    const resources = [RES("done")] as BackendResource[];
    expect(isResumableJob({ status: "interrupted" }, resources)).toBe(false);
  });

  it("los otros estados no ofrecen reanudación global", () => {
    const resources = [RES("pending")] as BackendResource[];
    expect(isResumableJob({ status: "running" }, resources)).toBe(false);
    expect(isResumableJob({ status: "queued" }, resources)).toBe(false);
    expect(isResumableJob({ status: "error" }, resources)).toBe(false);
    expect(isResumableJob({ status: "done" }, resources)).toBe(false);
    expect(isResumableJob(null, resources)).toBe(false);
  });

  it("un job interrumpido sin resources no es reanudable", () => {
    expect(isResumableJob({ status: "interrupted" }, [])).toBe(false);
    expect(isResumableJob({ status: "interrupted" })).toBe(false);
  });
});

describe("resumableResourceIds", () => {
  it("devuelve solo los ids pending/error, en orden", () => {
    const snapshot = {
      status: "interrupted",
      resources: [RES("done"), RES("pending"), RES("error")] as BackendResource[],
    };
    expect(resumableResourceIds(snapshot)).toEqual(["r-pending", "r-error"]);
  });

  it("snapshot ausente → vacío", () => {
    expect(resumableResourceIds(null)).toEqual([]);
  });
});

describe("degraded: el estado nuevo del validador", () => {
  const job = { status: "interrupted" };

  it("un recurso degraded hace el job reanudable", () => {
    expect(
      isResumableJob(job, [
        { id: "1", phase_type: "engage", status: "degraded", phase_order: 1, resource_order: 1 },
      ]),
    ).toBe(true);
  });

  it("degraded entra en los ids a reanudar", () => {
    const snap = {
      status: "interrupted",
      resources: [
        { id: "a", phase_type: "engage", status: "done", phase_order: 1, resource_order: 1 },
        { id: "b", phase_type: "explore", status: "degraded", phase_order: 2, resource_order: 1 },
      ],
    };
    expect(resumableResourceIds(snap)).toEqual(["b"]);
  });

  it("no se pinta como pendiente: salio mal y debe verse", () => {
    expect(mapResourceStatus("degraded")).toBe("X");
  });
});
