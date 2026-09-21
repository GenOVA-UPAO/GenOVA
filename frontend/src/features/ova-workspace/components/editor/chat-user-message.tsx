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

export function ChatUserMessage({ message, onRemove }: Readonly<Props>) {
  const labels = message.resourceLabels ?? [];

  return (
    <li className="rounded-xl border border-primary/25 bg-primary/5 p-3 shadow-2xs transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
          <Icon name="user" className="size-3.5" />
          <span>Tú</span>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground hover:text-destructive"
          aria-label={`Eliminar mensaje: ${messagePreview(message.text)}`}
          onClick={() => {
            onRemove(message.id);
          }}
        >
          <Icon name="trash" className="size-3" />
        </Button>
      </div>

      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {message.text}
      </p>

      {labels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {labels.map((label) => (
            <span
              key={label}
              className="rounded-md border border-primary/20 bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-primary"
            >
              {label}
            </span>
          ))}
        </div>
      )}
    </li>
  );
}
