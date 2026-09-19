import { useState } from "react";

import { Button } from "@/core/components/ui/button";

import { useChatRegeneration } from "../../hooks/use-chat-regeneration";
import { useOvaUploads } from "../../hooks/use-uploads";
import type { PhaseWithContent } from "../../lib/types";
import { ChatComposer } from "./chat-composer";
import { ChatHistory } from "./chat-history";
import { ChatResourceSelect } from "./chat-resource-select";

export function WorkspaceChatPanel({ ovaId, phases }: Readonly<{ ovaId: string; phases: PhaseWithContent[] }>) {
  const [prompt, setPrompt] = useState("");
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const uploads = useOvaUploads();
  const regen = useChatRegeneration(ovaId);
  const submit = (all = false) => {
    if (!regen.busy) regen.request.mutate({ prompt: all ? "Regenerar OVA completo" : prompt, phaseIds: all ? [] : selected });
  };
  const error = regen.request.error?.message ?? regen.error ?? uploads.uploadError;
  return (
    <aside className="min-w-0 space-y-4 border-r p-4">
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
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={regen.busy}
          onClick={() => {
            submit(true);
          }}
        >
          Regenerar OVA completo
        </Button>
        <Button
          variant="outline"
          aria-pressed={selecting}
          onClick={() => {
            setSelecting(!selecting);
          }}
        >
          Seleccionar recursos
        </Button>
      </div>
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
      <ChatComposer
        prompt={prompt}
        onPrompt={setPrompt}
        onSubmit={() => {
          submit();
        }}
        busy={regen.busy}
        uploads={uploads}
      />
      {regen.busy && (
        <p role="status">
          {regen.progress.stage} {regen.progress.percentage}%
        </p>
      )}
      {error && <p role="alert">{error}</p>}
    </aside>
  );
}
