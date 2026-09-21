import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import { cn } from "@/core/lib/cn";

import type { RegenChatMessage } from "../../lib/regen-chat";
import { ChatProgressBar } from "./chat-progress-bar";

function messagePreview(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "sin texto";
  return trimmed.length > 48 ? `${trimmed.slice(0, 48)}…` : trimmed;
}

function assistantHeaderTitle(message: RegenChatMessage): string {
  if (message.status === "running") return "Regenerando…";
  if (message.status === "error") return "Error de regeneración";
  if (message.status === "success") return "Regeneración completada";
  return "Asistente GenOVA";
}

function assistantIconName(status?: string): string {
  if (status === "running") return "spinner";
  if (status === "error") return "warning-circle";
  return "sparkle";
}

function assistantIconClass(status?: string): string {
  if (status === "running") return "animate-spin text-primary";
  if (status === "error") return "text-destructive";
  return "text-primary";
}

interface Props {
  message: RegenChatMessage;
  onRemove: (id: string) => void;
}

export function ChatAssistantMessage({ message, onRemove }: Readonly<Props>) {
  const iconName = assistantIconName(message.status);
  const iconClass = assistantIconClass(message.status);

  return (
    <li className="rounded-xl border border-border bg-card p-3 shadow-2xs transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Icon name={iconName} className={cn("size-3.5", iconClass)} />
          <span>{assistantHeaderTitle(message)}</span>
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

      {message.percentage !== undefined && (
        <div className="mt-2.5">
          <ChatProgressBar percentage={message.percentage} />
        </div>
      )}
    </li>
  );
}
