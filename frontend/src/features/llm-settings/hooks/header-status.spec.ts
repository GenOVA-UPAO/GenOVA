import i18n from "i18next";
import { afterEach, describe, expect, it } from "vitest";

import { favoritesLabel, headerStatusText } from "./header-status";

describe("headerStatusText", () => {
  afterEach(async () => {
    await i18n.changeLanguage("es");
  });

  it("«Sin verificar» cuenta como conectado y se desglosa", () => {
    const t = i18n.t.bind(i18n);
    expect(headerStatusText({ connected: 1, total: 8, unverified: 1 }, "", t)).toBe(
      "1 de 8 proveedores conectados (1 sin verificar)",
    );
  });

  it("sin sin-verificar no añade desglose y suma favoritos", () => {
    const t = i18n.t.bind(i18n);
    expect(headerStatusText({ connected: 2, total: 8 }, favoritesLabel(2, t), t)).toBe(
      "2 de 8 proveedores conectados · 2 modelos favoritos",
    );
  });

  it("sale traducido con la interfaz en inglés", async () => {
    await i18n.changeLanguage("en");
    const t = i18n.t.bind(i18n);
    expect(headerStatusText({ connected: 1, total: 8, unverified: 1 }, favoritesLabel(1, t), t)).toBe(
      "1 of 8 providers connected (1 unverified) · 1 favorite model",
    );
  });
});
