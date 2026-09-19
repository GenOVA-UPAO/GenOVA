import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_EDUCATION_LEVEL,
  EDUCATION_LEVELS,
  loadEducationLevel,
  NIVEL_STORAGE_KEY,
  promptWithLevel,
} from "./education-levels";

function storageWith(value: string | null) {
  return { getItem: vi.fn(() => value) };
}

describe("promptWithLevel", () => {
  it("prepends the level line to the user prompt", () => {
    expect(promptWithLevel("Tema: la fotosíntesis", "universitario-inicial")).toBe(
      "Nivel educativo: universitario (ciclos iniciales).\n\nTema: la fotosíntesis",
    );
  });

  it("maps every level to its own Spanish prompt text", () => {
    for (const level of EDUCATION_LEVELS) {
      expect(promptWithLevel("Tema: la fotosíntesis", level.id)).toBe(
        `Nivel educativo: ${level.promptText}.\n\nTema: la fotosíntesis`,
      );
    }
  });

  it("does not duplicate when the prompt already states the level, ignoring case", () => {
    const stated = "NIVEL EDUCATIVO: secundaria.\nTema: la fotosíntesis";
    const mixed = "Nivel Educativo: posgrado.\nTema: la fotosíntesis";
    expect(promptWithLevel(stated, "universitario-avanzado")).toBe(stated);
    expect(promptWithLevel(mixed, "universitario-avanzado")).toBe(mixed);
  });

  it("keeps the level line as the whole prompt for blank prompts", () => {
    expect(promptWithLevel("   ", "secundaria")).toBe("Nivel educativo: secundaria.");
  });
});

describe("loadEducationLevel", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("reads the last choice from the genova.ova.nivel key", () => {
    localStorage.setItem(NIVEL_STORAGE_KEY, "posgrado");
    expect(loadEducationLevel(localStorage)).toBe("posgrado");
  });

  it("falls back to the default for missing or invalid saved values", () => {
    expect(loadEducationLevel(storageWith(null))).toBe(DEFAULT_EDUCATION_LEVEL);
    expect(loadEducationLevel(storageWith("doctorado"))).toBe(DEFAULT_EDUCATION_LEVEL);
    expect(DEFAULT_EDUCATION_LEVEL).toBe("universitario-inicial");
  });
});
