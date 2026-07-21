import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { patchChatMessage, type RegenChatMessage, userChatMessage } from "../lib/regen-chat";
import { OvaEditService } from "./ova-edit.service";
import { OvaWorkspaceService } from "./ova-workspace.service";
import { OvaWorkspaceChatService } from "./ova-workspace-chat.service";

vi.mock("ngx-sonner", () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));

/**
 * Historial de chat en memoria.
 *
 * El servicio real persiste por HTTP y no estaba stubbeado, así que hacía fetch de
 * verdad: `init()` lanza `void chat.load(ovaId)` sin await, el fetch fallaba más
 * tarde y su `catch` vaciaba el historial (`set([])`), borrando los mensajes que el
 * test acababa de añadir — de ahí "expected 0 to be greater than or equal to 2".
 *
 * Se stubea vía TestBed y no con vi.mock del módulo http porque el sistema de test
 * de Angular rechaza vi.mock con imports relativos ("Please use Angular TestBed for
 * mocking dependencies") y lo ignora en silencio con el alias "@/".
 * Conserva la semántica real de la lista para que las aserciones sigan valiendo.
 */
function chatServiceStub() {
  const messagesState = signal<RegenChatMessage[]>([]);
  return {
    messages: messagesState.asReadonly(),
    reset: vi.fn(() => {
      messagesState.set([]);
    }),
    load: vi.fn(() => Promise.resolve()),
    append: vi.fn((msg: RegenChatMessage) => {
      messagesState.update((msgs) => [...msgs, msg]);
      return Promise.resolve();
    }),
    appendMany: vi.fn((msgs: RegenChatMessage[]) => {
      messagesState.update((prev) => [...prev, ...msgs]);
      return Promise.resolve();
    }),
    patch: vi.fn((id: string, patch: Partial<RegenChatMessage>) => {
      messagesState.update((msgs) => patchChatMessage(msgs, id, patch));
      return Promise.resolve();
    }),
    logSelectionToggle: vi.fn(() => Promise.resolve()),
    logSelectionAll: vi.fn(() => Promise.resolve()),
    logSelectionMode: vi.fn(() => Promise.resolve()),
    logRegenAllIntent: vi.fn(() => {
      const msg = userChatMessage("Regenerar todo el OVA", { kind: "regen_all" });
      messagesState.update((msgs) => [...msgs, msg]);
      return Promise.resolve(msg);
    }),
    deleteMessage: vi.fn((id: string) => {
      messagesState.update((msgs) => msgs.filter((m) => m.id !== id));
      return Promise.resolve();
    }),
    clearAll: vi.fn(() => {
      messagesState.set([]);
      return Promise.resolve();
    }),
  };
}

function editServiceStub() {
  return {
    addPhase: vi.fn(() => Promise.resolve({})),
    deletePhase: vi.fn(() => Promise.resolve({})),
    fetchOvaEditorData: vi.fn(() => Promise.resolve({ status: "listo" })),
    pollRegenProgress: vi.fn(() =>
      Promise.resolve({ percentage: 100, stage: "listo", status: "success" }),
    ),
    reorderPhases: vi.fn(() => Promise.resolve({})),
    savePhaseContent: vi.fn(() => Promise.resolve({})),
    triggerRegen: vi.fn(() => Promise.resolve({ job_id: "job-1" })),
  };
}

describe("OvaWorkspaceService — mutaciones de fase (HU-026/031/032/033)", () => {
  let service: OvaWorkspaceService;
  let edit: ReturnType<typeof editServiceStub>;

  beforeEach(async () => {
    edit = editServiceStub();
    TestBed.configureTestingModule({
      providers: [
        OvaWorkspaceService,
        { provide: OvaEditService, useValue: edit },
        { provide: OvaWorkspaceChatService, useValue: chatServiceStub() },
      ],
    });
    service = TestBed.inject(OvaWorkspaceService);
    service.init("ova-1");
    // dejar terminar el load() inicial de init()
    await vi.waitFor(() => {
      expect(edit.fetchOvaEditorData).toHaveBeenCalledTimes(1);
    });
    // `init()` también lanza `void chat.load()` sin await: se drena aquí para que
    // no vacíe el historial en mitad de un test.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it("savePhase llama a savePhaseContent y recarga el OVA", async () => {
    await service.savePhase("fase-9", "<p>nuevo</p>");

    expect(edit.savePhaseContent).toHaveBeenCalledWith("ova-1", "fase-9", "<p>nuevo</p>");
    expect(edit.fetchOvaEditorData).toHaveBeenCalledTimes(2);
  });

  it("deletePhase llama a deletePhase y recarga el OVA", async () => {
    await service.deletePhase("fase-9");

    expect(edit.deletePhase).toHaveBeenCalledWith("ova-1", "fase-9");
    expect(edit.fetchOvaEditorData).toHaveBeenCalledTimes(2);
  });

  it("addPhase llama a addPhase con tipo y prompt y recarga el OVA", async () => {
    await service.addPhase("engage", "Un cómic sobre redes");

    expect(edit.addPhase).toHaveBeenCalledWith("ova-1", "engage", "Un cómic sobre redes");
    expect(edit.fetchOvaEditorData).toHaveBeenCalledTimes(2);
  });

  it("reorderPhases mapea la lista a [{phase_id, new_order}] por índice global", async () => {
    await service.reorderPhases([
      { id: "b", phase_type: "engage" },
      { id: "a", phase_type: "engage" },
      { id: "c", phase_type: "explore" },
    ]);

    expect(edit.reorderPhases).toHaveBeenCalledWith("ova-1", [
      { new_order: 0, phase_id: "b" },
      { new_order: 1, phase_id: "a" },
      { new_order: 2, phase_id: "c" },
    ]);
    expect(edit.fetchOvaEditorData).toHaveBeenCalledTimes(2);
  });

  it("runRegen con faseIds envía el subconjunto al endpoint de regeneración", async () => {
    await service.runRegen({ faseIds: ["fase-9"], prompt: "más ejemplos" });

    expect(edit.triggerRegen).toHaveBeenCalledWith("ova-1", {
      faseIds: ["fase-9"],
      prompt: "más ejemplos",
    });
  });

  it("submitPrompt deja el prompt en el historial del chat", async () => {
    service.setPrompt("Añade más ejemplos prácticos");
    await service.submitPrompt(["fase-9"]);

    const msgs = service.chatMessages();
    expect(msgs.length).toBeGreaterThanOrEqual(2);
    expect(msgs.some((m) => m.role === "user" && m.text === "Añade más ejemplos prácticos")).toBe(
      true,
    );
    expect(msgs.some((m) => m.role === "assistant")).toBe(true);
    expect(service.prompt()).toBe("");
  });

  it("un fallo en la mutación no recarga el OVA", async () => {
    edit.deletePhase.mockRejectedValueOnce(new Error("boom"));

    await service.deletePhase("fase-9");

    expect(edit.fetchOvaEditorData).toHaveBeenCalledTimes(1);
  });
});

describe("OvaWorkspaceService — aislamiento entre OVAs y teardown (B1)", () => {
  it("init con otro OVA limpia el estado del anterior mientras carga el nuevo", async () => {
    const edit = {
      ...editServiceStub(),
      fetchOvaEditorData: vi.fn((id: string) =>
        id === "ova-A"
          ? Promise.resolve({
              status: "listo",
              title: "A",
              current_version: { phases: [{ id: "p1", phase_type: "engage" }] },
            })
          : new Promise(() => {}),
      ),
    };
    TestBed.configureTestingModule({
      providers: [OvaWorkspaceService, { provide: OvaEditService, useValue: edit }],
    });
    const service = TestBed.inject(OvaWorkspaceService);

    service.init("ova-A");
    await vi.waitFor(() => {
      expect(service.phases().length).toBe(1);
    });
    service.setPrompt("prompt de A");

    service.init("ova-B");

    expect(service.ova()).toBeNull();
    expect(service.phases()).toEqual([]);
    expect(service.prompt()).toBe("");
    expect(service.error()).toBe("");
    expect(service.chatMessages()).toEqual([]);
  });

  it("teardown cancela el reintento de load cuando el OVA está generando", async () => {
    vi.useFakeTimers();
    try {
      const edit = editServiceStub();
      edit.fetchOvaEditorData = vi.fn(() =>
        Promise.reject(Object.assign(new Error("generando"), { status: 409 })),
      );
      TestBed.configureTestingModule({
        providers: [OvaWorkspaceService, { provide: OvaEditService, useValue: edit }],
      });
      const service = TestBed.inject(OvaWorkspaceService);

      service.init("ova-A");
      await vi.advanceTimersByTimeAsync(0);
      expect(edit.fetchOvaEditorData).toHaveBeenCalledTimes(1);
      expect(service.generating()).toBe(true);

      service.teardown();
      await vi.advanceTimersByTimeAsync(30000);

      expect(edit.fetchOvaEditorData).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
