import { describe, expect, it } from "vitest";

import { generateBlocker, missingPromptChars, selectionSummary } from "./creation-guidance";

describe("creation guidance", () => {
  it("explains everything that is missing in one sentence", () => {
    expect(generateBlocker("", 0)).toBe("Para generar, describe el tema y elige recursos en al menos 2 fases.");
    expect(generateBlocker("corto", 1)).toBe("Para generar, completa la descripción y elige recursos en 1 fase más.");
    expect(generateBlocker("corto", 2)).toBe("Para generar, faltan 5 caracteres en la descripción.");
    expect(generateBlocker("Un tema válido", 1)).toBe("Para generar, elige recursos en 1 fase más.");
    expect(generateBlocker("Un tema válido", 2)).toBeNull();
  });
  it("counts trimmed characters", () => {
    expect(missingPromptChars("   abc   ")).toBe(7);
    expect(missingPromptChars("0123456789")).toBe(0);
  });
  it("summarises the selection with correct plurals", () => {
    expect(selectionSummary(0, 0)).toBe("Sin recursos elegidos");
    expect(selectionSummary(1, 1)).toBe("1 recurso en 1 fase");
    expect(selectionSummary(3, 2)).toBe("3 recursos en 2 fases");
  });
});
