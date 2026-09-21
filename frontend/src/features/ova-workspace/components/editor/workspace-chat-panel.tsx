import { useState } from "react";

import { Icon } from "@/core/components/icon";

import { useChatRegeneration } from "../../hooks/use-chat-regeneration";
import { useOvaUploads } from "../../hooks/use-uploads";
import { labelsForPhaseIds } from "../../lib/regen-chat";
import type { PhaseWithContent } from "../../lib/types";
import { ChatComposer } from "./chat-composer";
import { ChatHistory } from "./chat-history";
import { ChatPanelHeader } from "./chat-panel-header";

function composerPlaceholder(selecting: boolean, count: number): string {
  if (selecting && count > 0) {
    return `Cambio para ${String(count)} recurso${count !== 1 ? "s" : ""}…`;
  }
  return "Escribe un cambio o mejora para el OVA…";
}

function withToggledId(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((v) => v !== id) : [...list, id];
}

function createRegenPayload(
  all: boolean,
  prompt: string,
  selected: string[],
  phases: PhaseWithContent[],
) {
  const phaseIds = all ? [] : selected;
  return {
    prompt: all ? "Regenerar OVA completo" : prompt,
    phaseIds,
    resourceLabels: labelsForPhaseIds(phases, phaseIds),
  };
}

export function WorkspaceChatPanel({
  ovaId,
  phases,
}: Readonly<{ ovaId: string; phases: PhaseWithContent[] }>) {
  const [prompt, setPrompt] = useState("");
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const uploads = useOvaUploads();
  const regen = useChatRegeneration(ovaId);

  const submit = (all = false) => {
    if (!regen.busy) {
      regen.request.mutate(createRegenPayload(all, prompt, selected, phases));
    }
  };

  const error = regen.request.error?.message ?? regen.error ?? uploads.uploadError;

  return (
    <aside className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden border-r bg-card/30">
      <ChatPanelHeader
        busy={regen.busy}
        selecting={selecting}
        selected={selected}
        phases={phases}
        onRegenAll={() => {
          submit(true);
        }}
        onToggleSelect={() => {
          setSelecting(!selecting);
        }}
        onToggleResource={(id) => {
          setSelected(withToggledId(selected, id));
        }}
        onSelectAllResources={() => {
          setSelected(phases.map((p) => p.id));
        }}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
        <ChatHistory
          messages={regen.chat.data ?? []}
          onRemove={(id) => {
            regen.chat.remove.mutate(id);
          }}
          onClear={() => {
            regen.chat.clear.mutate();
          }}
          onSelectPrompt={(text) => {
            setPrompt(text);
          }}
        />
      </div>

      <div className="shrink-0 space-y-3 border-t bg-background/50 p-4">
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
          <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
            <Icon name="spinner" className="animate-spin text-primary" />
            <span>
              {regen.progress.stage} {String(regen.progress.percentage)}%
            </span>
          </p>
        )}
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    </aside>
  );
}
