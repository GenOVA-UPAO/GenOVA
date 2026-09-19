import { describe, expect, it } from "vitest";

import { draftHasIssues, validateDraft, validateTaskChain } from "./chain-validation";
import type { TaskDraft } from "./llm-config-draft";

const llama: TaskDraft = {
  default: { provider: "groq", model_id: "llama" },
  fallbacks: [],
};

describe("validateTaskChain", () => {
  it("allows an empty primary and an empty fallback list", () => {
    expect(
      validateTaskChain({
        default: { provider: "", model_id: "" },
        fallbacks: [],
      }),
    ).toEqual([]);
    expect(validateTaskChain(llama)).toEqual([]);
    expect(validateTaskChain(undefined)).toEqual([]);
  });

  it("flags an empty fallback slot", () => {
    expect(
      validateTaskChain({
        ...llama,
        fallbacks: [{ provider: "", model_id: "" }],
      }),
    ).toEqual([{ index: 0, message: "Elige un modelo para este fallback." }]);
    expect(
      validateTaskChain({
        ...llama,
        fallbacks: [{ provider: "groq", model_id: "" }],
      }),
    ).toEqual([{ index: 0, message: "Elige un modelo para este fallback." }]);
  });

  it("flags a fallback that repeats the primary", () => {
    expect(
      validateTaskChain({
        ...llama,
        fallbacks: [{ provider: "groq", model_id: "llama" }],
      }),
    ).toEqual([{ index: 0, message: "Este modelo ya es el primario." }]);
  });

  it("flags the later duplicate in the chain, not the first", () => {
    expect(
      validateTaskChain({
        ...llama,
        fallbacks: [
          { provider: "openrouter", model_id: "gpt" },
          { provider: "openrouter", model_id: "gpt" },
        ],
      }),
    ).toEqual([{ index: 1, message: "Este modelo ya está en la cadena." }]);
  });
});

describe("validateDraft", () => {
  it("indexes issues by task and reports whether the draft is blocked", () => {
    const draft = {
      texto: llama,
      codigo: {
        default: { provider: "groq", model_id: "code" },
        fallbacks: [{ provider: "", model_id: "" }],
      },
    };
    expect(validateDraft(draft, ["texto", "codigo"])).toEqual({
      codigo: [{ index: 0, message: "Elige un modelo para este fallback." }],
    });
    expect(draftHasIssues(draft, ["texto", "codigo"])).toBe(true);
    expect(draftHasIssues(draft, ["texto"])).toBe(false);
    expect(draftHasIssues(null, ["texto"])).toBe(false);
  });
});
