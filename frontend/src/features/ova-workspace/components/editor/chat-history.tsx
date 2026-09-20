import { Button } from "@/core/components/ui/button";

import type { RegenChatMessage } from "../../lib/regen-chat";

function messagePreview(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "sin texto";
  return trimmed.length > 48 ? `${trimmed.slice(0, 48)}…` : trimmed;
}

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
      {messages.length === 0 && (
        <p className="rounded-md border border-dashed border-border/70 bg-muted/10 px-3 py-4 text-center text-xs text-muted-foreground">
          Aquí verás el historial de tus prompts y el progreso de cada generación.
        </p>
      )}
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
              aria-label={`Eliminar mensaje: ${messagePreview(message.text)}`}
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
