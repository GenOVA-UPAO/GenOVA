import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useTopicArea } from "./use-topic-area";

const getTopicArea = vi.hoisted(() => vi.fn());
vi.mock("@/core/services/platform-settings.api", () => ({ getTopicArea }));

function wrapper({ children }: Readonly<{ children: ReactNode }>) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useTopicArea", () => {
  beforeEach(() => {
    getTopicArea.mockReset();
  });

  it("devuelve el área activa sin espacios sobrantes", async () => {
    getTopicArea.mockResolvedValue({ area: "  machine learning " });
    const { result } = renderHook(() => useTopicArea(), { wrapper });
    await waitFor(() => { expect(result.current).toBe("machine learning"); });
  });

  it("devuelve vacío si no hay área o la petición falla", async () => {
    getTopicArea.mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useTopicArea(), { wrapper });
    await waitFor(() => { expect(getTopicArea).toHaveBeenCalled(); });
    expect(result.current).toBe("");
  });
});
