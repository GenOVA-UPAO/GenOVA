import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { usePhaseBlocks } from "../../hooks/use-phase-blocks";
import { useVisualComposer } from "../../hooks/use-visual-composer";
import { VisualEditorPanel } from "./visual-editor-panel";

const resetState = vi.fn();

vi.mock("../../hooks/use-phase-blocks", () => ({
  usePhaseBlocks: vi.fn(() => ({ data: [], isLoading: false })),
}));
vi.mock("../../hooks/use-visual-composer", () => ({
  useVisualComposer: vi.fn(() => ({
    editedBlocks: null,
    composedSpec: null,
    pendingConfirmation: null,
    lastIntent: null,
    lastTrace: null,
    prompt: "",
    isProcessing: false,
    isApplying: false,
    canUndo: false,
    resetState,
    setPrompt: vi.fn(),
    handleEdit: vi.fn(),
    handleApply: vi.fn(),
    handleUndo: vi.fn(),
    handleConfirmPending: vi.fn(),
    handleCancelPending: vi.fn(),
  })),
}));

describe("VisualEditorPanel", () => {
  it("follows the resource to its new id after a version change", () => {
    const { rerender } = render(<VisualEditorPanel ovaId="o1" phases={[{ id: "p1", phase_type: "engage", phase_order: 0 }]} />);
    expect(vi.mocked(usePhaseBlocks).mock.lastCall).toEqual(["o1", "p1"]);
    rerender(<VisualEditorPanel ovaId="o1" phases={[{ id: "p2", phase_type: "engage", phase_order: 0 }]} />);
    expect(vi.mocked(usePhaseBlocks).mock.lastCall).toEqual(["o1", "p2"]);
    expect(vi.mocked(useVisualComposer).mock.lastCall).toEqual(["o1", "p2"]);
    expect(resetState).toHaveBeenCalled();
  });
});
