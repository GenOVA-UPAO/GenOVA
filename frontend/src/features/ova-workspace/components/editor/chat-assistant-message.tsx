import { useTranslation } from "react-i18next";

import { Icon } from "@/core/components/icon";
import { cn } from "@/core/lib/cn";

import type { RegenChatMessage } from "../../lib/regen-chat";
import type { RegenCancel } from "./cancel-regen-button";
import { ChatDeleteButton } from "./chat-delete-button";
import { ChatRunningExtras } from "./chat-running-extras";

const STATUS = {
  running: { icon: "spinner", tone: "text-primary", spin: true, label: "workspace:en_curso" },
  error: { icon: "warning-circle", tone: "text-destructive", spin: false, label: "workspace:error" },
  success: { icon: "check-circle", tone: "text-success", spin: false, label: "workspace:completado_93" },
  idle: { icon: "sparkle", tone: "text-primary", spin: false, label: "GenOVA" },
} as const;

interface Props {
  message: RegenChatMessage;
  onRemove: (id: string) => void;
  cancel?: RegenCancel;
}

/** Un «en curso» que esta sesión no puede cancelar (no lo sigue) también se puede borrar. */
function canRemove(running: boolean, cancel: RegenCancel | undefined): boolean {
  return !running || (!cancel?.canCancel && !cancel?.cancelling);
}

/** Respuesta del sistema: alineada a la izquierda, sin burbuja, con icono de estado. */
export function ChatAssistantMessage({ message, onRemove, cancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const status = STATUS[message.status ?? "idle"];
  const running = message.status === "running";
  const removable = canRemove(running, cancel);
  return (
    <li className="group flex items-start gap-2 pr-6">
      <span
        className={cn(
          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted",
          message.status === "error" && "bg-destructive/10",
        )}
      >
        <Icon name={status.icon} label={message.status ? t(status.label) : status.label} className={cn("size-3.5", status.tone, status.spin && "animate-spin")} />
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
        {running && <ChatRunningExtras percentage={message.percentage} cancel={cancel} />}
      </div>
      {removable && (
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
