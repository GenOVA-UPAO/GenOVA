import {
  finishChatPatch,
  formatChatTarget,
  labelsForPhaseIds,
  patchChatMessage,
  selectionAllMessage,
  selectionToggleMessage,
  userChatMessage,
} from "./regen-chat";

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
