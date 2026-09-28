import { Icon } from "@/core/components/icon";
import { cn } from "@/core/lib/cn";

import type { RegenChatMessage } from "../../lib/regen-chat";
import { ChatDeleteButton } from "./chat-delete-button";
import { ChatProgressBar } from "./chat-progress-bar";

const STATUS = {
  running: { icon: "spinner", tone: "text-primary", spin: true, label: "En curso" },
  error: { icon: "warning-circle", tone: "text-destructive", spin: false, label: "Error" },
  success: { icon: "check-circle", tone: "text-success", spin: false, label: "Completado" },
  idle: { icon: "sparkle", tone: "text-primary", spin: false, label: "GenOVA" },
} as const;

interface Props {
  message: RegenChatMessage;
  onRemove: (id: string) => void;
}

/** Respuesta del sistema: alineada a la izquierda, sin burbuja, con icono de estado. */
export function ChatAssistantMessage({ message, onRemove }: Readonly<Props>) {
  const status = STATUS[message.status ?? "idle"];
  const running = message.status === "running";
  return (
    <li className="group flex items-start gap-2 pr-6">
      <span
        className={cn(
          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted",
          message.status === "error" && "bg-destructive/10",
        )}
      >
        <Icon name={status.icon} label={status.label} className={cn("size-3.5", status.tone, status.spin && "animate-spin")} />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p
          className={cn(
            "text-sm leading-relaxed break-words whitespace-pre-wrap",
            message.status === "error" ? "text-destructive" : "text-foreground",
          )}
        >
          {message.text}
        </p>
        {running && message.percentage !== undefined && (
          <ChatProgressBar percentage={message.percentage} className="mt-1.5 max-w-60" />
        )}
      </div>
      {!running && (
        <ChatDeleteButton
          text={message.text}
          onDelete={() => {
            onRemove(message.id);
          }}
        />
      )}
    </li>
  );
}
