import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as workspaceApi from "../api/ova-workspace.api";
import * as chatApi from "../api/workspace-chat.api";
import { useChatRegeneration } from "./use-chat-regeneration";

vi.mock("../api/ova-workspace.api", () => ({
  fetchActiveRegeneration: vi.fn(),
  fetchRegenerationProgress: vi.fn(),
  triggerOvaRegeneration: vi.fn(),
  cancelOvaRegeneration: vi.fn(),
}));
vi.mock("../api/workspace-chat.api", () => ({
  fetchWorkspaceChat: vi.fn(() =>
    Promise.resolve({
      messages: [{ id: "m1", role: "assistant", kind: "status", text: "Regenerando…", status: "running", percentage: 40 }],
    }),
  ),
  createWorkspaceChatMessage: vi.fn(() => Promise.resolve({})),
  updateWorkspaceChatMessage: vi.fn(() => Promise.resolve({})),
  deleteWorkspaceChatMessage: vi.fn(),
  clearWorkspaceChat: vi.fn(),
}));

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderHook(() => useChatRegeneration("ova-1"), {
    wrapper: ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  });
}

describe("useChatRegeneration with a running message left by another session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("closes it when no regeneration is active anymore", async () => {
    vi.mocked(workspaceApi.fetchActiveRegeneration).mockResolvedValue({ job_id: null });
    setup();
    await waitFor(() => {
      expect(chatApi.updateWorkspaceChatMessage).toHaveBeenCalledWith(
        "ova-1",
        expect.objectContaining({ id: "m1", status: "error" }),
      );
    });
    expect(workspaceApi.fetchRegenerationProgress).not.toHaveBeenCalled();
  });

  it("adopts the active job and finalizes the message when it ends", async () => {
    vi.mocked(workspaceApi.fetchActiveRegeneration).mockResolvedValue({ job_id: "j1" });
    vi.mocked(workspaceApi.fetchRegenerationProgress).mockResolvedValue({ status: "success", percentage: 100 });
    const { result } = setup();
    await waitFor(() => {
      expect(workspaceApi.fetchRegenerationProgress).toHaveBeenCalledWith("ova-1", "j1");
    });
    await waitFor(() => {
      expect(chatApi.updateWorkspaceChatMessage).toHaveBeenCalledWith(
        "ova-1",
        expect.objectContaining({ id: "m1", status: "success" }),
      );
    });
    expect(result.current.cancel.canCancel).toBe(true);
  });
});
