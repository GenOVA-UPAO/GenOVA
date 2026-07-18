import {
  finishChatPatch,
  labelsForPhaseIds,
  patchChatMessage,
  userChatMessage,
} from "./regen-chat";

describe("regen-chat", () => {
  it("userChatMessage guarda texto y etiquetas de recurso", () => {
    const msg = userChatMessage("Mejora el intro", ["Juego de Gamificación"]);
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

  it("patchChatMessage y finishChatPatch actualizan el asistente", () => {
    const user = userChatMessage("hola");
    const asst = { id: "asst-1", role: "assistant" as const, text: "…", createdAt: 1, status: "running" as const };
    const patched = patchChatMessage([user, asst], "asst-1", finishChatPatch("success"));
    expect(patched[1].status).toBe("success");
    expect(patched[1].percentage).toBe(100);
  });
});
