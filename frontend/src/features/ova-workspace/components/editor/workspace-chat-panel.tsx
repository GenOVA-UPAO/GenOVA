import { useState } from "react";

import { useChatRegeneration } from "../../hooks/use-chat-regeneration";
import { useOvaUploads } from "../../hooks/use-uploads";
import { labelsForPhaseIds } from "../../lib/regen-chat";
import type { PhaseWithContent } from "../../lib/types";
import { ChatComposer } from "./chat-composer";
import { ChatHistory } from "./chat-history";
import { ChatRegenToolbar } from "./chat-regen-toolbar";
import { ChatResourceSelect } from "./chat-resource-select";

function composerPlaceholder(selecting: boolean, count: number): string {
  if (selecting && count > 0) {
    return `Cambio para ${String(count)} recurso${count !== 1 ? "s" : ""}…`;
  }
  return "Escribe un cambio o mejora para el OVA…";
}

export function WorkspaceChatPanel({ ovaId, phases }: Readonly<{ ovaId: string; phases: PhaseWithContent[] }>) {
  const [prompt, setPrompt] = useState("");
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const uploads = useOvaUploads();
  const regen = useChatRegeneration(ovaId);
  const submit = (all = false) => {
    if (regen.busy) return;
    const phaseIds = all ? [] : selected;
    regen.request.mutate({
      prompt: all ? "Regenerar OVA completo" : prompt,
      phaseIds,
      resourceLabels: labelsForPhaseIds(phases, phaseIds),
    });
  };
  const error = regen.request.error?.message ?? regen.error ?? uploads.uploadError;
  return (
    <aside className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden border-r bg-card/30">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <h2 className="font-display text-xl">Instrucciones</h2>
        <ChatHistory
          messages={regen.chat.data ?? []}
          onRemove={(id) => {
            regen.chat.remove.mutate(id);
          }}
          onClear={() => {
            regen.chat.clear.mutate();
          }}
        />
        <ChatRegenToolbar
          busy={regen.busy}
          selecting={selecting}
          selectedCount={selected.length}
          onRegenAll={() => {
            submit(true);
          }}
          onToggleSelect={() => {
            setSelecting(!selecting);
          }}
        />
        {selecting && (
          <ChatResourceSelect
            phases={phases}
            selected={selected}
            onToggle={(id, checked) => {
              setSelected(checked ? [...selected, id] : selected.filter((value) => value !== id));
            }}
            onSelectAll={() => {
              setSelected(phases.map((phase) => phase.id));
            }}
          />
        )}
      </div>
      <div className="shrink-0 space-y-4 border-t p-4">
        <ChatComposer
          prompt={prompt}
          onPrompt={setPrompt}
          onSubmit={() => {
            submit();
          }}
          busy={regen.busy}
          uploads={uploads}
          placeholder={composerPlaceholder(selecting, selected.length)}
        />
        {regen.busy && (
          <p role="status">
            {regen.progress.stage} {regen.progress.percentage}%
          </p>
        )}
        {error && <p role="alert">{error}</p>}
      </div>
    </aside>
  );
}
