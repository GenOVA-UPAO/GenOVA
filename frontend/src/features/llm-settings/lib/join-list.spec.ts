import { describe, expect, it } from "vitest";

import { joinList } from "./join-list";

describe("joinList", () => {
  it("returns empty string for no items", () => {
    expect(joinList([])).toBe("");
  });

  it("returns the single name", () => {
    expect(joinList(["Groq"])).toBe("Groq");
  });

  it("joins two names with y", () => {
    expect(joinList(["Groq", "OpenCode"])).toBe("Groq y OpenCode");
  });

  it("uses commas then y for three or more", () => {
    expect(joinList(["Groq", "OpenCode", "HuggingFace"])).toBe("Groq, OpenCode y HuggingFace");
  });
});
