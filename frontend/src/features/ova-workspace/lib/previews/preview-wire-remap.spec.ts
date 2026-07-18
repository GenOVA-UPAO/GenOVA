import { describe, expect, it } from "vitest";

import { getResourcePreview } from "../resource-previews";
import { ALL_WIREFRAME_KINDS, type WireframeKind } from "./preview-types";

const PHASES = ["engage", "explore", "explain", "elaborate", "evaluate"] as const;
const kindSet = new Set<string>(ALL_WIREFRAME_KINDS);

describe("resource preview wire remap", () => {
  it("maps all 50 resources to a known WireframeKind", () => {
    const wires: WireframeKind[] = [];
    for (const phase of PHASES) {
      for (let id = 1; id <= 10; id++) {
        const info = getResourcePreview(phase, id);
        expect(info, `${phase}:${id}`).toBeTruthy();
        expect(kindSet.has(info!.wire), `${phase}:${id} → ${info!.wire}`).toBe(true);
        wires.push(info!.wire);
      }
    }
    expect(wires).toHaveLength(50);
  });

  it("uses storyboard for former video resources", () => {
    expect(getResourcePreview("engage", 2)?.wire).toBe("storyboard");
    expect(getResourcePreview("explore", 4)?.wire).toBe("storyboard");
    expect(getResourcePreview("explain", 1)?.wire).toBe("storyboard");
  });

  it("keeps chat only for Agente Socrático", () => {
    expect(getResourcePreview("explore", 2)?.wire).toBe("chat");
    expect(getResourcePreview("engage", 7)?.wire).toBe("decisions");
    expect(getResourcePreview("explore", 8)?.wire).toBe("decisions");
  });

  it("splits map/card/game families into specific kinds", () => {
    expect(getResourcePreview("explore", 9)?.wire).toBe("matching");
    expect(getResourcePreview("explain", 3)?.wire).toBe("graph");
    expect(getResourcePreview("elaborate", 8)?.wire).toBe("cardGrid");
    expect(getResourcePreview("evaluate", 7)?.wire).toBe("crossword");
    expect(getResourcePreview("evaluate", 10)?.wire).toBe("diploma");
    expect(getResourcePreview("elaborate", 7)?.wire).toBe("code");
    expect(getResourcePreview("elaborate", 5)?.wire).toBe("dashboard");
  });
});
