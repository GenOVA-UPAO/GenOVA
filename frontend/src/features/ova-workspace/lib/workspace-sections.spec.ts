import { describe, expect, it } from "vitest";

import type { PhaseWithContent } from "./types";
import { sectionTypes } from "./workspace-sections";

const phase = (id: string, phaseType: string): PhaseWithContent => ({ id, phase_type: phaseType });

describe("sectionTypes", () => {
  it("añade las fases elegidas al crear aunque se hayan quedado sin recursos", () => {
    expect(sectionTypes([phase("a", "engage")], ["engage", "explore"])).toEqual([
      "engage",
      "explore",
    ]);
  });

  it("ordena las fases según el ciclo 5E y no repite", () => {
    expect(
      sectionTypes([phase("a", "evaluate"), phase("b", "engage")], ["explain", "engage"]),
    ).toEqual(["engage", "explain", "evaluate"]);
  });

  it("sin job solo muestra las fases con recursos", () => {
    expect(sectionTypes([phase("a", "explore")])).toEqual(["explore"]);
  });
});
