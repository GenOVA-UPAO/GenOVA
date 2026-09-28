import { useEffect, useRef, useState } from "react";

import { ConfirmModal } from "@/core/components/confirm-modal";
import { Button } from "@/core/components/ui/button";

import type { RegenChatMessage } from "../../lib/regen-chat";
import { ChatEmptyState } from "./chat-empty-state";
import { ChatMessageItem } from "./chat-message-item";

interface Props {
  messages: RegenChatMessage[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onSelectPrompt?: (prompt: string) => void;
}

function countLabel(count: number): string {
  return count === 1 ? "1 mensaje" : `${String(count)} mensajes`;
}

/** Hilo de instrucciones: lo más reciente abajo, como en cualquier chat. */
export function ChatHistory({ messages, onRemove, onClear, onSelectPrompt }: Readonly<Props>) {
  const list = useRef<HTMLOListElement>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const last = messages.at(-1);
  useEffect(() => {
    const node = list.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.length, last?.text, last?.percentage]);
  if (messages.length === 0) {
    return (
      <section aria-label="Historial de chat" className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <ChatEmptyState onSelectPrompt={onSelectPrompt} />
      </section>
    );
  }
  return (
    <section aria-label="Historial de chat" className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 px-4 pt-2">
        <span className="text-xs text-muted-foreground">{countLabel(messages.length)}</span>
        <Button
          variant="ghost"
          size="xs"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => {
            setConfirmClear(true);
          }}
        >
          Limpiar historial
        </Button>
      </div>
      <ol ref={list} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pt-2 pb-4">
        {messages.map((message) => (
          <ChatMessageItem key={message.id} message={message} onRemove={onRemove} />
        ))}
      </ol>
      {confirmClear && (
        <ConfirmModal
          title="¿Limpiar el historial?"
          message={`Se borrarán ${countLabel(messages.length)} de este hilo. El OVA y sus versiones no cambian.`}
          confirmLabel="Limpiar historial"
          onConfirm={() => {
            onClear();
            setConfirmClear(false);
          }}
          onCancel={() => {
            setConfirmClear(false);
          }}
        />
      )}
    </section>
  );
}
