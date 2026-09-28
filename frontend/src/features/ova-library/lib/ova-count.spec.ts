import { describe, expect, it } from "vitest";

import { ovaCountPhrase, ovaNoun } from "./ova-count";

describe("ovaNoun", () => {
  it("usa singular y plural", () => {
    expect(ovaNoun(1)).toBe("OVA");
    expect(ovaNoun(0)).toBe("OVAs");
    expect(ovaNoun(2)).toBe("OVAs");
  });
});

describe("ovaCountPhrase", () => {
  it("acuerda el verbo con la cantidad", () => {
    expect(ovaCountPhrase(1, "restaurado", "restaurados")).toBe("1 OVA restaurado");
    expect(ovaCountPhrase(3, "restaurado", "restaurados")).toBe("3 OVAs restaurados");
  });
});
