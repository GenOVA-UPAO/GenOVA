import {
  buttonRegenPayload,
  chatAttachments,
  finishChatPatch,
  formatChatTarget,
  labelsForPhaseIds,
  messageRegenPayload,
  patchChatMessage,
  ragReportText,
  selectionAllMessage,
  selectionToggleMessage,
  splitAttachments,
  userChatMessage,
} from "./regen-chat";

describe("payloads de regeneración", () => {
  const phases = [{ id: "a", phase_type: "engage", title: "Cómic" }];

  it("un botón no manda su etiqueta como instrucción", () => {
    // Regresión: «Regenerar OVA completo» viajaba como prompt y el OVA de la
    // Ley de Ohm pasó a tratar sobre cómo regenerar un OVA.
    const payload = buttonRegenPayload(phases, "Regenerar OVA completo", []);
    expect(payload.prompt).toBe("");
    expect(payload.historyText).toBe("Regenerar OVA completo");
    expect(payload.phaseIds).toEqual([]);
  });

  it("regenerar un recurso lo rehace, no lo edita con su etiqueta", () => {
    const payload = buttonRegenPayload(phases, "Regenerar recurso", ["a"]);
    expect(payload.prompt).toBe("");
    expect(payload.phaseIds).toEqual(["a"]);
    expect(payload.resourceLabels).toEqual(["Cómic"]);
  });

  it("un mensaje escrito sí es la instrucción", () => {
    const payload = messageRegenPayload(phases, "Sube el contraste", ["a"]);
    expect(payload.prompt).toBe("Sube el contraste");
    expect(payload.historyText).toBe("Sube el contraste");
  });
});

describe("regen-chat", () => {
  it("userChatMessage guarda texto y etiquetas de recurso", () => {
    const msg = userChatMessage("Mejora el intro", {
      resourceLabels: ["Juego de Gamificación"],
    });
    expect(msg.role).toBe("user");
    expect(msg.text).toBe("Mejora el intro");
    expect(msg.resourceLabels).toEqual(["Juego de Gamificación"]);
  });

  it("labelsForPhaseIds resuelve títulos", () => {
    expect(
      labelsForPhaseIds(
        [
          { id: "a", phase_type: "engage", title: "Juego" },
          { id: "b", phase_type: "explore", title: "Lab" },
        ],
        ["b"],
      ),
    ).toEqual(["Lab"]);
  });

  it("finishChatPatch nombra el recurso", () => {
    const user = userChatMessage("hola");
    const asst = {
      id: "asst-1",
      role: "assistant" as const,
      kind: "status" as const,
      text: "…",
      createdAt: 1,
      status: "running" as const,
    };
    const patched = patchChatMessage(
      [user, asst],
      "asst-1",
      finishChatPatch("success", ["Juego de Gamificación"]),
    );
    expect(patched[1].text).toContain("Juego de Gamificación");
  });

  it("formatChatTarget distingue OVA completo y recursos", () => {
    expect(formatChatTarget()).toBe("al OVA completo");
    expect(formatChatTarget(["Lab"])).toBe("a «Lab»");
  });

  it("selection messages reflejan marcar y seleccionar todos", () => {
    expect(selectionToggleMessage("Lab", true).text).toContain("seleccionado");
    expect(selectionAllMessage(["A", "B"], true).text).toContain("todos");
    expect(selectionAllMessage(["A", "B"], false).text).toContain("vació");
  });
});

describe("adjuntos del chat (HU-024)", () => {
  const phases = [{ id: "a", phase_type: "engage", title: "Cómic" }];

  it("solo cuenta los archivos ya subidos", () => {
    const attachments = chatAttachments([
      { uploadId: "", filename: "subiendo.pdf" },
      { uploadId: "u1", filename: "apunte.pdf" },
    ]);
    expect(attachments).toEqual({ ids: ["u1"], names: ["apunte.pdf"] });
  });

  it("el mensaje viaja limpio al backend y el historial muestra los adjuntos", () => {
    const payload = messageRegenPayload(phases, "Usa el apunte", [], { ids: ["u1"], names: ["apunte.pdf"] });
    expect(payload.prompt).toBe("Usa el apunte");
    expect(payload.uploadIds).toEqual(["u1"]);
    expect(splitAttachments(payload.historyText)).toEqual({ text: "Usa el apunte", attachments: ["apunte.pdf"] });
  });

  it("un mensaje sin adjuntos no cambia", () => {
    expect(splitAttachments("Sube el contraste")).toEqual({ text: "Sube el contraste", attachments: [] });
  });
});

describe("informe del material consultado", () => {
  it("nombra los archivos usados y distingue los del OVA", () => {
    const text = ragReportText({
      status: "used",
      sources: [
        { filename: "apunte.pdf", chunks: 3, origin: "adjunto" },
        { filename: "silabo.docx", chunks: 1, origin: "ova" },
      ],
      attachments: [{ filename: "apunte.pdf", used: true }],
    });
    expect(text).toBe("Material consultado: apunte.pdf (3 fragmentos), silabo.docx (1 fragmento, del OVA).");
  });

  it("no finge que se usó un adjunto con el RAG desactivado", () => {
    const text = ragReportText({
      status: "disabled",
      sources: [],
      attachments: [{ filename: "apunte.pdf", used: false, reason: "La búsqueda en archivos (RAG) está desactivada en este servidor." }],
    });
    expect(text).not.toContain("Material consultado");
    expect(text).toContain("No se usó «apunte.pdf»: La búsqueda en archivos (RAG) está desactivada");
  });

  it("sin material no añade nada", () => {
    expect(ragReportText({ status: "none", sources: [], attachments: [] })).toBe("");
    expect(ragReportText(null)).toBe("");
  });

  it("el mensaje final lleva el informe debajo del «Listo»", () => {
    const patch = finishChatPatch("success", undefined, {
      status: "used",
      sources: [{ filename: "apunte.pdf", chunks: 2, origin: "adjunto" }],
    });
    expect(patch.text).toBe(
      "Listo. Los cambios ya están aplicados al OVA completo.\nMaterial consultado: apunte.pdf (2 fragmentos).",
    );
  });
});
