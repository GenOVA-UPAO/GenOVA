import { Button } from "@/core/components/ui/button";

import type { RegenChatMessage } from "../../lib/regen-chat";

export function ChatHistory({
  messages,
  onRemove,
  onClear,
}: Readonly<{ messages: RegenChatMessage[]; onRemove: (id: string) => void; onClear: () => void }>) {
  return (
    <section aria-label="Historial de chat" className="space-y-3">
      <Button variant="ghost" size="sm" disabled={messages.length === 0} onClick={onClear}>
        Limpiar historial
      </Button>
      <ol className="max-h-[40vh] space-y-3 overflow-y-auto">
        {messages.map((message) => (
          <li key={message.id} className="rounded-xl border bg-card p-3">
            <p className="whitespace-pre-wrap text-sm">{message.text}</p>
            {message.percentage !== undefined && (
              <progress className="w-full" value={message.percentage} max={100} aria-label="Progreso de regeneración" />
            )}
            <Button
              variant="ghost"
              size="sm"
              aria-label="Eliminar mensaje"
              onClick={() => {
                onRemove(message.id);
              }}
            >
              Eliminar
            </Button>
          </li>
        ))}
      </ol>
    </section>
  );
}
