import { describe, expect, it } from "vitest";

import { PALETTES } from "@/core/lib/ova-palettes";

import { themeFromSettings, themePayload, themeSummary } from "./ova-theme";

const OCEANO = PALETTES[1];

describe("themeFromSettings", () => {
  it("sin estilo guardado empieza en UPAO", () => {
    expect(themeFromSettings(undefined)).toEqual({ color: "upao", design: "upao" });
  });

  it("«IA elige» pasa a «free» en los dos ejes", () => {
    expect(themeFromSettings({ colorMode: "ai", designMode: "ai" })).toEqual({
      color: "free",
      design: "free",
    });
  });

  it("«Personalizado» lleva la paleta guardada", () => {
    expect(themeFromSettings({ colorMode: "custom", designMode: "upao", palette: OCEANO })).toEqual({
      color: "custom",
      design: "upao",
      palette: OCEANO,
    });
  });

  it("una paleta desconocida o «Mis plantillas» vuelven a UPAO", () => {
    expect(
      themeFromSettings({ colorMode: "custom", designMode: "custom", palette: { name: "Otra" } }),
    ).toEqual({ color: "upao", design: "upao" });
  });
});

describe("themePayload", () => {
  it("envía primario y acento solo con «custom»", () => {
    expect(themePayload({ color: "custom", design: "free", palette: OCEANO })).toEqual({
      color: "custom",
      design: "free",
      palette: { name: "Oceano", primary: "#164E63", accent: "#38BDF8" },
    });
    expect(themePayload({ color: "upao", design: "upao", palette: OCEANO })).toEqual({
      color: "upao",
      design: "upao",
    });
  });

  it("«custom» sin paleta viaja como UPAO", () => {
    expect(themePayload({ color: "custom", design: "upao" })).toEqual({
      color: "upao",
      design: "upao",
    });
  });
});

describe("themeSummary", () => {
  it("resume el tema para la barra", () => {
    expect(themeSummary({ color: "upao", design: "upao" })).toBe("UPAO");
    expect(themeSummary({ color: "free", design: "free" })).toBe("IA elige");
    expect(themeSummary({ color: "custom", design: "upao", palette: OCEANO })).toBe("Paleta Oceano");
    expect(themeSummary({ color: "upao", design: "free" })).toBe("Mixto");
  });
});
