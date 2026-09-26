import { Icon } from "@/core/components/icon";

import { type RegenChatMessage, splitAttachments } from "../../lib/regen-chat";
import { resourceDisplayName } from "../../lib/resource-display-name";
import { ChatDeleteButton } from "./chat-delete-button";

interface Props {
  message: RegenChatMessage;
  onRemove: (id: string) => void;
}

/** Mensaje del docente: burbuja alineada a la derecha, con los recursos a los que se aplicó y sus adjuntos. */
export function ChatUserMessage({ message, onRemove }: Readonly<Props>) {
  const labels = message.resourceLabels ?? [];
  const { text, attachments } = splitAttachments(message.text);
  return (
    <li className="group flex items-start justify-end gap-1.5 pl-6">
      <ChatDeleteButton
        text={message.text}
        className="mt-1"
        onDelete={() => {
          onRemove(message.id);
        }}
      />
      <div className="min-w-0 max-w-[85%] rounded-xl rounded-tr-sm bg-primary/10 px-3 py-2 dark:bg-primary/20">
        <span className="sr-only">Tú: </span>
        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap text-foreground">{text}</p>
        {attachments.length > 0 && (
          <ul aria-label="Archivos adjuntos" className="mt-1.5 flex flex-wrap gap-1">
            {attachments.map((name) => (
              <li
                key={name}
                className="flex max-w-full items-center gap-1 rounded-md bg-background/70 px-1.5 py-0.5 text-xs text-muted-foreground"
              >
                <Icon name="paperclip" className="size-3 shrink-0" />
                <span className="truncate">{name}</span>
              </li>
            ))}
          </ul>
        )}
        {labels.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">Aplicado a: {labels.map(resourceDisplayName).join(", ")}</p>
        )}
      </div>
    </li>
  );
}
