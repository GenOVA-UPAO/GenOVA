import { describe, expect, it } from "vitest";

import { defaultGenerationEnabled, isMediaTask, toDraft, toPayload } from "./llmConfigDraft";
import { modelsForTask } from "./task-model-pool";

describe("llmConfigDraft media", () => {
  it("marks imagen/video as media; video generation defaults off", () => {
    expect(isMediaTask("imagen")).toBe(true);
    expect(isMediaTask("video")).toBe(true);
    expect(isMediaTask("texto")).toBe(false);
    expect(defaultGenerationEnabled("video")).toBe(false);
    expect(defaultGenerationEnabled("imagen")).toBe(true);
  });

  it("toDraft/toPayload round-trip generation_enabled", () => {
    const draft = toDraft(
      {
        defaults: {
          imagen: { provider: "runware", model_id: "runware:100@1" },
        },
        fallbacks: {},
        generation_enabled: { imagen: true, video: false },
      },
      ["imagen", "video", "texto"],
    );
    expect(draft["imagen"].generationEnabled).toBe(true);
    expect(draft["video"].generationEnabled).toBe(false);
    expect(draft["texto"].generationEnabled).toBeUndefined();

    const payload = toPayload(draft, ["imagen", "video", "texto"]);
    expect(payload.generation_enabled).toEqual({ imagen: true, video: false });
    expect(payload.defaults?.["imagen"]?.model_id).toBe("runware:100@1");
  });
});

describe("modelsForTask", () => {
  const catalog = [
    { provider: "a", model_id: "1", aptitudes: ["texto", "imagen"] },
    { provider: "b", model_id: "2", aptitudes: ["imagen"] },
    { provider: "c", model_id: "3", aptitudes: ["video"] },
    { provider: "d", model_id: "4", category: "texto" },
  ];

  it("filters by aptitudes; multimodal can appear in several tasks", () => {
    expect(modelsForTask(catalog, "imagen").map((m) => m.model_id)).toEqual(["1", "2"]);
    expect(modelsForTask(catalog, "texto").map((m) => m.model_id)).toEqual(["1", "4"]);
    expect(modelsForTask(catalog, "video").map((m) => m.model_id)).toEqual(["3"]);
  });
});
