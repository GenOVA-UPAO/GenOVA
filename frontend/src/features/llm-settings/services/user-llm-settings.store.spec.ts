import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";

import { UserLlmSettingsService } from "./user-llm-settings.service";
import { UserLlmSettingsStore } from "./user-llm-settings.store";

describe("UserLlmSettingsStore", () => {
  it("solicita el catálogo completo para que orden y grupos no usen solo una página", async () => {
    const api = {
      getLlmSettings: vi.fn().mockResolvedValue({
        catalog_full: [
          { provider: "openrouter", model_id: "barato" },
          { provider: "openrouter", model_id: "caro" },
        ],
        full_total: 2,
        full_page: 1,
        full_has_more: false,
      }),
    };
    TestBed.configureTestingModule({
      providers: [UserLlmSettingsStore, { provide: UserLlmSettingsService, useValue: api }],
    });
    const store = TestBed.inject(UserLlmSettingsStore);

    await store.load();

    expect(api.getLlmSettings).toHaveBeenCalledWith({
      search: "",
      category: "all",
      type: "all",
      page: 1,
      page_size: 1000,
    });
    expect(store.catalogFull()).toHaveLength(2);
    expect(store.fullTotal()).toBe(2);
    expect(store.fullHasMore()).toBe(false);
  });
});
