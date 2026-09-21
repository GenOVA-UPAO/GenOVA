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

export function ChatHistory({
  messages,
  onRemove,
  onClear,
  onSelectPrompt,
}: Readonly<Props>) {
  return (
    <section aria-label="Historial de chat" className="flex min-h-0 flex-1 flex-col">
      {messages.length > 0 && (
        <div className="mb-3 flex shrink-0 items-center justify-between border-b pb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Historial ({String(messages.length)})
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={onClear}
          >
            Limpiar historial
          </Button>
        </div>
      )}
      {messages.length === 0 ? (
        <ChatEmptyState onSelectPrompt={onSelectPrompt} />
      ) : (
        <ol className="flex-1 min-h-0 space-y-3 overflow-y-auto pr-1">
          {messages.map((message) => (
            <ChatMessageItem key={message.id} message={message} onRemove={onRemove} />
          ))}
        </ol>
      )}
    </section>
  );
}
