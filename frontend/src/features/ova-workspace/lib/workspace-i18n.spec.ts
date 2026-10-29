import i18n from "i18next";
import { describe, expect, it } from "vitest";

import { selectionSummary } from "./creation-guidance";
import { EDUCATION_LEVELS, promptWithLevel } from "./education-levels";
import { phaseMeta } from "./phase-meta";
import { phaseCfg } from "./phase-select.config";
import { EVALUATE_PREVIEWS } from "./previews/evaluate";
import { EXPLORE_PREVIEWS } from "./previews/explore";
import { splitAttachments, withAttachments } from "./regen-chat";
import { getSchema } from "./resource-config";
import { resourceDisplayName } from "./resource-display-name";
import { FEEDBACK_REASONS } from "./resource-feedback";
import { uploadPhase } from "./upload-rag-status";

describe("workspace es/en", () => {
  it("traduce GeoGebra y quiz adaptativo conservando sus nombres canónicos", async () => {
    const geogebra = EXPLORE_PREVIEWS["11"];
    const quiz = EVALUATE_PREVIEWS["11"];
    expect(quiz.canonicalLabel).toBe("Quiz Adaptativo");
    await i18n.changeLanguage("en");
    expect(quiz.label).toBe("Adaptive Quiz");
    expect(quiz.bullets).toContain("Dynamic adjustment");
    expect(geogebra.label).toBe("GeoGebra Applet");
    expect(geogebra.bullets).toContain("Answer checking");
    expect(geogebra.canonicalLabel).toBe("Applet GeoGebra");
    expect(quiz.canonicalLabel).toBe("Quiz Adaptativo");
  });
  it("traduce los catálogos ya importados y mantiene los identificadores y el contenido", async () => {
    const field = getSchema("engage", "1")[0];
    const config = phaseCfg("engage");
    const level = EDUCATION_LEVELS[0];
    const reason = FEEDBACK_REASONS.find((item) => item.value === "diseño");
    expect(field.label).toBe("Viñetas");
    const prompt = promptWithLevel("Mi tema original", level.id);
    await i18n.changeLanguage("en");
    expect(field.label).toBe("Panels");
    expect(field.key).toBe("num_panels");
    expect(config?.sub).toBe("Spark curiosity and activate prior knowledge");
    expect(phaseMeta("enganche").label).toBe("Engage");
    expect(level.label).toBe("University · introductory courses");
    expect(reason?.label).toBe("Layout");
    expect(reason?.value).toBe("diseño");
    expect(resourceDisplayName("Cómic Interactivo")).toBe("Interactive comic");
    expect(resourceDisplayName("Mi título en español")).toBe("Mi título en español");
    expect(promptWithLevel("Mi tema original", level.id)).toBe(prompt);
    expect(selectionSummary(3, 2)).toBe("3 resources in 2 phases");
  });

  it("lee los adjuntos persistidos aunque cambie el idioma de la interfaz", async () => {
    const persisted = withAttachments("No cambies mi contenido", ["guía.pdf"]);
    await i18n.changeLanguage("en");
    expect(splitAttachments(persisted)).toEqual({ text: "No cambies mi contenido", attachments: ["guía.pdf"] });
    expect(withAttachments("No cambies mi contenido", ["guía.pdf"])).toBe(persisted);
    expect(uploadPhase({ clientId: "1", uploadId: "1", filename: "guía.pdf", contentType: "application/pdf", sizeBytes: 1, status: "success", message: "", ragStatus: { status: "indexed", chunks: 2 } }).label).toBe("Ready · 2 excerpts");
  });
});
