import { describe, expect, it } from "vitest";

import { nextRowKeys } from "./stable-row-keys";

const phase = (id: string, order: number) => ({ id, phase_type: "engage", phase_order: order });

describe("nextRowKeys", () => {
  it("hands the previous key to the phase that took the same position in a new version", () => {
    const before = [phase("a1", 0), phase("b1", 1)];
    const keys = nextRowKeys({ phases: [], keys: new Map() }, before);
    const after = nextRowKeys({ phases: before, keys }, [phase("a2", 0), phase("b2", 1)]);
    expect([after.get("a2"), after.get("b2")]).toEqual(["a1", "b1"]);
  });

  it("keeps each key with its phase after a reorder", () => {
    const before = [phase("a", 0), phase("b", 1)];
    const keys = nextRowKeys({ phases: [], keys: new Map() }, before);
    const after = nextRowKeys({ phases: before, keys }, [phase("b", 0), phase("a", 1)]);
    expect([after.get("b"), after.get("a")]).toEqual(["b", "a"]);
  });
});
