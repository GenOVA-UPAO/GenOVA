import i18n from "i18next";
import { describe, expect, it } from "vitest";

import { apiErrorText } from "./api-error";
import { setLanguage } from "./config";
import { formatDate, formatNumber, formatRelativeTime } from "./format";
import { detectLanguage, LANGUAGE_STORAGE_KEY, normalizeLanguage } from "./languages";

describe("detectLanguage", () => {
  it("prefiere el idioma guardado sobre el del navegador", () => {
    expect(detectLanguage("en", ["es-PE"])).toBe("en");
  });

  it("usa el primer idioma soportado del navegador", () => {
    expect(detectLanguage(null, ["fr-FR", "en-GB", "es"])).toBe("en");
  });

  it("cae en español si nada coincide", () => {
    expect(detectLanguage(null, ["fr-FR", "de"])).toBe("es");
    expect(detectLanguage(null, [])).toBe("es");
  });

  it("normaliza regiones y descarta valores desconocidos", () => {
    expect(normalizeLanguage("EN_us")).toBe("en");
    expect(normalizeLanguage("pt-BR")).toBeNull();
    expect(normalizeLanguage(null)).toBeNull();
  });
});

describe("cambio de idioma", () => {
  it("traduce, persiste la preferencia y actualiza <html lang>", async () => {
    expect(i18n.t("actions.save")).toBe("Guardar");

    await setLanguage("en");

    expect(i18n.t("actions.save")).toBe("Save");
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });

  it("usa español cuando falta la clave en inglés", async () => {
    await i18n.changeLanguage("en");
    i18n.addResource("es", "common", "solo_es", "Solo español");
    expect(i18n.t("solo_es")).toBe("Solo español");
  });
});

describe("formatos con Intl", () => {
  const date = new Date(Date.UTC(2026, 0, 15, 12));

  it("formatea fechas y números según el idioma activo", async () => {
    await i18n.changeLanguage("es");
    expect(formatDate(date, { month: "long", timeZone: "UTC" })).toBe("enero");
    expect(formatNumber(1234.5)).toBe(new Intl.NumberFormat("es").format(1234.5));

    await i18n.changeLanguage("en");
    expect(formatDate(date, { month: "long", timeZone: "UTC" })).toBe("January");
    expect(formatNumber(1234.5)).toBe("1,234.5");
  });

  it("describe tiempo relativo en cada idioma", async () => {
    const now = Date.UTC(2026, 0, 15);
    await i18n.changeLanguage("es");
    expect(formatRelativeTime(now - 3 * 86_400_000, now)).toBe("hace 3 días");
    await i18n.changeLanguage("en");
    expect(formatRelativeTime(now - 3 * 86_400_000, now)).toBe("3 days ago");
  });

  it("devuelve cadena vacía con fechas inválidas", () => {
    expect(formatDate("no-es-fecha")).toBe("");
  });
});

describe("errores de la API", () => {
  it("traduce códigos conocidos y deja el resto al mensaje del backend", async () => {
    await i18n.changeLanguage("en");
    expect(apiErrorText("invalid_credentials", 401)).toBe("Incorrect email or password.");
    expect(apiErrorText("codigo_raro", 400)).toBeUndefined();
    expect(apiErrorText("", 429)).toBe("Too many requests. Please try again in a moment.");
    await i18n.changeLanguage("es");
    expect(apiErrorText("invalid_credentials", 401)).toBe("Correo o contraseña incorrectos.");
  });
});
