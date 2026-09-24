import type { RegenChatMessage } from "../../lib/regen-chat";
import { resourceDisplayName } from "../../lib/resource-display-name";
import { ChatDeleteButton } from "./chat-delete-button";

interface Props {
  message: RegenChatMessage;
  onRemove: (id: string) => void;
}

/** Mensaje del docente: burbuja alineada a la derecha, con los recursos a los que se aplicó. */
export function ChatUserMessage({ message, onRemove }: Readonly<Props>) {
  const labels = message.resourceLabels ?? [];
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
        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap text-foreground">{message.text}</p>
        {labels.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">Aplicado a: {labels.map(resourceDisplayName).join(", ")}</p>
        )}
      </div>
    </li>
  );
}
