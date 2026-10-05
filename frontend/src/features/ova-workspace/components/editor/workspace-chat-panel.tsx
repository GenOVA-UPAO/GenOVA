import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { ChatRegeneration } from "../../hooks/use-chat-regeneration";
import { useUndoableChatDelete } from "../../hooks/use-undoable-chat-delete";
import { useOvaUploads } from "../../hooks/use-uploads";
import {
  buttonRegenPayload,
  chatAttachments,
  messageRegenPayload,
  type RegenPayload,
} from "../../lib/regen-chat";
import type { PhaseWithContent } from "../../lib/types";
import { ChatComposer } from "./chat-composer";
import { ChatHistory } from "./chat-history";
import { ChatPanelHeader } from "./chat-panel-header";
import { ChatResourceSelect } from "./chat-resource-select";
import { ChatScopeToggle } from "./chat-scope-toggle";

function withToggledId(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((v) => v !== id) : [...list, id];
}

export function WorkspaceChatPanel({
  phases,
  regen,
}: Readonly<{ phases: PhaseWithContent[]; regen: ChatRegeneration }>) {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState("");
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  // Adjuntos del chat de ESTE OVA (no se mezclan con los de «Crear OVA»).
  const uploads = useOvaUploads(regen.ovaId);
  const removal = useUndoableChatDelete((id) => {
    regen.chat.remove.mutate(id);
  });
  // Regenerar crea una versión nueva con ids nuevos: la selección solo cuenta
  // los recursos que siguen existiendo. Al cerrar el selector, vuelve al OVA entero.
  const live = selected.filter((id) => phases.some((phase) => phase.id === id));
  const scopeIds = selecting ? live : [];
  const submit = (payload: RegenPayload, onSent?: () => void) => {
    if (regen.busy) return;
    // Tras enviarlos, el backend ya los ligó al OVA: salen de la lista del chat.
    regen.request.mutate(payload, { onSuccess: () => { void uploads.refresh(); onSent?.(); } });
  };
  // Los fallos de la regeneración ya se leen en el hilo; aquí solo lo que no llegó a él.
  const error = regen.composerError ?? uploads.uploadError;

  return (
    <aside
      aria-label={t("workspace:panel_de_instrucciones")}
      className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden border-r border-border bg-card"
    >
      <ChatPanelHeader
        busy={regen.busy || uploads.uploading || uploads.indexing}
        onRegenAll={() => {
          submit(buttonRegenPayload(phases, t("workspace:regenerar_ova_completo"), [], chatAttachments(uploads.data)));
        }}
      />
      <ChatHistory
        messages={(regen.chat.data ?? []).filter((m) => !removal.hidden.includes(m.id))}
        onRemove={removal.request}
        onClear={() => {
          regen.chat.clear.mutate();
        }}
        onSelectPrompt={setPrompt}
      />
      <div className="shrink-0 space-y-2 border-t border-border bg-background/60 p-3 sm:p-4">
        <ChatComposer
          error={error}
          prompt={prompt}
          onPrompt={setPrompt}
          onSubmit={() => {
            submit(messageRegenPayload(phases, prompt, scopeIds, chatAttachments(uploads.data)), () => {
              setPrompt("");
            });
          }}
          busy={regen.busy}
          uploads={uploads}
           placeholder={selecting && live.length > 0 ? t("workspace:chatPlaceholder", { count: live.length }) : t("workspace:escribe_un_cambio_o_mejora_para_el_ova")}
          scope={
            <ChatScopeToggle
              selecting={selecting}
              count={live.length}
              onToggle={() => {
                setSelecting(!selecting);
              }}
            />
          }
          picker={
            selecting && (
              <ChatResourceSelect
                id="chat-resource-select"
                phases={phases}
                selected={live}
                onToggle={(id) => {
                  setSelected(withToggledId(live, id));
                }}
                onSelectAll={() => {
                  setSelected(phases.map((p) => p.id));
                }}
              />
            )
          }
        />
      </div>
    </aside>
  );
}
