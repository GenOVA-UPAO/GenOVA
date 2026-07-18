import { describe, expect, it } from "vitest";

import { MODALITY_META, PROVIDER_LABELS } from "./llm-catalog.utils";
import { CATEGORY_LABELS, TYPE_LABELS } from "./llm-settings-labels";

describe("HU-034 catalog labels", () => {
  it("exposes multimodal embedding audio and video type filters", () => {
    for (const t of ["multimodal", "embedding", "audio", "video", "imagen"]) {
      expect(TYPE_LABELS[t]).toBeTruthy();
    }
  });

  it("labels native image providers", () => {
    for (const p of ["huggingface", "siliconflow", "runware", "falai", "openrouter"]) {
      expect(CATEGORY_LABELS[p] || PROVIDER_LABELS[p]).toBeTruthy();
      expect(PROVIDER_LABELS[p]).toBeTruthy();
    }
  });

  it("has modality badge for video", () => {
    expect(MODALITY_META["video"]?.label).toBe("Video");
  });
});
