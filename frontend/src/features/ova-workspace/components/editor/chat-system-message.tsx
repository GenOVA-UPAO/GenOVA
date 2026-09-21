import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import type { RegenChatMessage } from "../../lib/regen-chat";

function messagePreview(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "sin texto";
  return trimmed.length > 48 ? `${trimmed.slice(0, 48)}…` : trimmed;
}

interface Props {
  message: RegenChatMessage;
  onRemove: (id: string) => void;
}

export function ChatSystemMessage({ message, onRemove }: Readonly<Props>) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-border/80 bg-muted/15 p-2.5 text-xs text-muted-foreground">
      <div className="flex min-w-0 items-center gap-1.5">
        <Icon name="info" className="size-3.5 shrink-0" />
        <span className="truncate">{message.text}</span>
      </div>
      <Button
        variant="ghost"
        size="icon-xs"
        className="shrink-0 text-muted-foreground hover:text-destructive"
        aria-label={`Eliminar mensaje: ${messagePreview(message.text)}`}
        onClick={() => {
          onRemove(message.id);
        }}
      >
        <Icon name="trash" className="size-3" />
      </Button>
    </li>
  );
}
