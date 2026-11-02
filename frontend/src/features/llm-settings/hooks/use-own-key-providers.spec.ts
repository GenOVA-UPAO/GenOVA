import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useOwnKeyModels, useOwnKeyProviders } from "./use-own-key-providers";
import { useUserApiKeys } from "./use-user-api-keys";

vi.mock("@/core/auth/auth-store", () => ({
  useIsAdmin: () => false,
}));

vi.mock("./use-user-api-keys", () => ({
  useUserApiKeys: vi.fn(),
}));

type ApiKeysState = ReturnType<typeof useUserApiKeys>;

function mockKeys(state: Partial<ApiKeysState>) {
  vi.mocked(useUserApiKeys).mockReturnValue({
    apiKeys: {},
    loading: false,
    error: null,
    ...state,
  } as ApiKeysState);
}

const MODELS = [
  { provider: "openrouter", model_id: "a" },
  { provider: "groq", model_id: "b" },
];

describe("useOwnKeyProviders", () => {
  beforeEach(() => {
    vi.mocked(useUserApiKeys).mockReset();
  });

  it("si no se pudieron leer las claves no restringe los modelos", () => {
    mockKeys({ error: new Error("x") });
    expect(renderHook(() => useOwnKeyProviders()).result.current).toBeNull();
    expect(renderHook(() => useOwnKeyModels(MODELS)).result.current).toHaveLength(2);
  });

  it("con las claves leídas solo deja los proveedores con clave", () => {
    mockKeys({ apiKeys: { groq: "••••1234" } });
    expect(renderHook(() => useOwnKeyProviders()).result.current).toEqual(new Set(["groq"]));
    expect(renderHook(() => useOwnKeyModels(MODELS)).result.current).toEqual([MODELS[1]]);
  });
});
