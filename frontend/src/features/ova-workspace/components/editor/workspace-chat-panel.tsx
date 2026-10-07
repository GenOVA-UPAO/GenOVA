import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { ChatRegeneration } from "../../hooks/use-chat-regeneration";
import { useChatScope } from "../../hooks/use-chat-scope";
import { useUndoableChatDelete } from "../../hooks/use-undoable-chat-delete";
import { useOvaUploads } from "../../hooks/use-uploads";
import { CONFIRM_ALL_THRESHOLD } from "../../lib/regen-cancel";
import {
  buttonRegenPayload,
  chatAttachments,
  messageRegenPayload,
  type RegenPayload,
} from "../../lib/regen-chat";
import type { PhaseWithContent } from "../../lib/types";
import { ChatComposer } from "./chat-composer";
import { ChatConfirmAll } from "./chat-confirm-all";
import { ChatHistory } from "./chat-history";
import { ChatPanelHeader } from "./chat-panel-header";
import { ChatResourceSelect } from "./chat-resource-select";
import { ChatScopeToggle } from "./chat-scope-toggle";

export function WorkspaceChatPanel({
  phases,
  regen,
}: Readonly<{ phases: PhaseWithContent[]; regen: ChatRegeneration }>) {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState("");
  const scope = useChatScope(phases);
  // Adjuntos del chat de ESTE OVA (no se mezclan con los de «Crear OVA»).
  const uploads = useOvaUploads(regen.ovaId);
  const removal = useUndoableChatDelete((id) => {
    regen.chat.remove.mutate(id);
  });
  const [confirmAll, setConfirmAll] = useState<RegenPayload>();
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
        cancel={regen.cancel}
      />
      <div className="shrink-0 space-y-2 border-t border-border bg-background/60 p-3 sm:p-4">
        <ChatComposer
          error={error}
          prompt={prompt}
          onPrompt={setPrompt}
          onSubmit={() => {
            const payload = messageRegenPayload(phases, prompt, scope.live, chatAttachments(uploads.data));
            // Una instrucción a todo el OVA con muchos recursos es lenta y cara: se confirma.
            if (scope.live.length === 0 && phases.length > CONFIRM_ALL_THRESHOLD) setConfirmAll(payload);
            else submit(payload, () => { setPrompt(""); });
          }}
          busy={regen.busy}
          uploads={uploads}
           placeholder={scope.live.length > 0 ? t("workspace:chatPlaceholder", { count: scope.live.length }) : t("workspace:escribe_un_cambio_o_mejora_para_el_ova")}
          scope={
            <ChatScopeToggle selecting={scope.selecting} count={scope.live.length} onClear={scope.clear} onToggle={scope.toggleOpen} />
          }
          picker={
            scope.selecting && (
              <ChatResourceSelect
                id="chat-resource-select"
                phases={phases}
                selected={scope.live}
                onToggle={scope.toggle}
                onSelectAll={scope.selectAll}
              />
            )
          }
        />
      </div>
      <ChatConfirmAll
        payload={confirmAll}
        count={phases.length}
        onConfirm={(payload) => {
          setConfirmAll(undefined);
          submit(payload, () => { setPrompt(""); });
        }}
        onCancel={() => { setConfirmAll(undefined); }}
      />
    </aside>
  );
}
