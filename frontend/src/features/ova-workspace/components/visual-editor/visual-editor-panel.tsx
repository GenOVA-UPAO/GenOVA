import { useState } from "react";

import { usePhaseBlocks } from "../../hooks/use-phase-blocks";
import { useVisualComposer } from "../../hooks/use-visual-composer";
import { buildInitialSpec } from "../../lib/initial-spec";
import type { PhaseWithContent } from "../../lib/types";
import type { ResourceBlock, VisualSpec } from "../../lib/visual-editor.types";
import { BlockList } from "./block-list";
import { IntentPreviewCard } from "./intent-preview-card";
import { VisualEditorHeader } from "./visual-editor-header";
import { VisualPreviewSection } from "./visual-preview-section";
import { VisualPromptControls } from "./visual-prompt-controls";

interface Props {
  ovaId: string;
  phases: PhaseWithContent[];
}

function resolveActiveSpec(spec: VisualSpec | null, blocks: ResourceBlock[]): VisualSpec | null {
  if (spec) return spec;
  if (blocks.length === 0) return null;
  return buildInitialSpec(blocks);
}

function resolveDisplayedIntent(composer: ReturnType<typeof useVisualComposer>) {
  const pending = composer.pendingConfirmation;
  if (pending) {
    return {
      intent: pending.intent,
      trace: pending.trace,
      isPending: true,
    };
  }
  return {
    intent: composer.lastIntent,
    trace: composer.lastTrace,
    isPending: false,
  };
}

export function VisualEditorPanel({ ovaId, phases }: Readonly<Props>) {
  const [activePhaseId, setActivePhaseId] = useState<string>(() => phases[0]?.id ?? "");

  const { data: rawBlocks, isLoading: isLoadingBlocks } = usePhaseBlocks(ovaId, activePhaseId);
  const baseBlocks = rawBlocks ?? [];

  const composer = useVisualComposer(ovaId, activePhaseId);
  const currentBlocks = composer.editedBlocks ?? baseBlocks;
  const activeSpec = resolveActiveSpec(composer.composedSpec, currentBlocks);
  const displayed = resolveDisplayedIntent(composer);

  const isPromptDisabled = composer.isProcessing || isLoadingBlocks || !composer.prompt.trim();
  const canApply = activeSpec !== null && currentBlocks.length > 0;

  const handleSelectPhase = (phaseId: string) => {
    setActivePhaseId(phaseId);
    composer.resetState();
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-3 sm:p-5">
      <VisualEditorHeader phases={phases} activePhaseId={activePhaseId} onSelectPhase={handleSelectPhase} />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-5">
          <BlockList blocks={currentBlocks} isLoading={isLoadingBlocks} />

          <VisualPromptControls
            prompt={composer.prompt}
            onChangePrompt={composer.setPrompt}
            onSubmit={() => {
              void composer.handleEdit(baseBlocks);
            }}
            isProcessing={composer.isProcessing}
            isDisabled={isPromptDisabled}
            statusMessage={composer.statusMessage}
            errorMessage={composer.errorMessage}
          />

          <IntentPreviewCard
            intent={displayed.intent}
            trace={displayed.trace}
            canUndo={composer.canUndo}
            onUndo={composer.handleUndo}
            isPendingConfirmation={displayed.isPending}
            onConfirm={composer.handleConfirmPending}
            onCancel={composer.handleCancelPending}
          />
        </div>

        <VisualPreviewSection
          spec={activeSpec}
          isApplying={composer.isApplying}
          canApply={canApply}
          onApply={() => {
            void composer.handleApply(activePhaseId, baseBlocks);
          }}
        />
      </div>
    </div>
  );
}
