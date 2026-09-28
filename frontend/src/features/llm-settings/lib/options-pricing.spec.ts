import type { ModelFacts } from "./model-facts";
import { optionsPricing } from "./options-pricing";

function facts(generates: ModelFacts["generates"]): { facts: ModelFacts } {
  return {
    facts: {
      free: false,
      variable: false,
      input: null,
      output: null,
      context: null,
      capabilities: [],
      recommended: false,
      media: null,
      generates,
    },
  };
}

describe("optionsPricing", () => {
  it("modelos de texto: precio por millón de tokens", () => {
    expect(optionsPricing([facts(null), facts(null)])).toEqual({
      mediaOnly: false,
      note: "Precio por millón de tokens: entrada / salida.",
    });
  });

  it("lista vacía: la nota de tokens", () => {
    expect(optionsPricing([]).mediaOnly).toBe(false);
  });

  it("solo generadores de video: precio por segundo", () => {
    expect(optionsPricing([facts("video"), facts("video")])).toEqual({
      mediaOnly: true,
      note: "Precio por segundo de video, a la resolución más barata.",
    });
  });

  it("generadores de imagen (o mezcla con video): precio por imagen", () => {
    expect(optionsPricing([facts("image")]).note).toContain("Precio por imagen");
    expect(optionsPricing([facts("image"), facts("video")])).toMatchObject({ mediaOnly: true });
  });

  it("un modelo de texto entre generadores devuelve la nota de tokens", () => {
    expect(optionsPricing([facts("image"), facts(null)]).mediaOnly).toBe(false);
  });
});
