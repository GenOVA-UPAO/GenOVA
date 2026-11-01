import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";

import { ovaWorkspaceKey,phaseVersionsKey } from "./use-ova-workspace";
import { phaseBlocksKey } from "./use-phase-blocks";
import { useVisualComposer } from "./use-visual-composer";

vi.mock("../lib/visual-composer-actions", () => ({
  executeComposerApply: vi.fn(() => Promise.resolve(true)),
  executeComposerEdit: vi.fn(),
}));

describe("useVisualComposer apply", () => {
  it("invalidates the queries that show the applied resource", async () => {
    const client = new QueryClient();
    const keys = [phaseBlocksKey("o1", "p1"), phaseVersionsKey("o1", "p1"), ovaWorkspaceKey("o1"), ["ova"]];
    for (const key of keys) client.setQueryData(key, {});
    const { result } = renderHook(() => useVisualComposer("o1", "p1"), {
      wrapper: ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    });
    await act(() => result.current.handleApply("p1", []));
    for (const key of keys) expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  });
});
