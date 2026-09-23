import type { RegenChatMessage } from "../../lib/regen-chat";
import { ChatDeleteButton } from "./chat-delete-button";

interface Props {
  message: RegenChatMessage;
  onRemove: (id: string) => void;
}

/** Aviso del sistema (cambios de selección): una línea centrada y discreta. */
export function ChatSystemMessage({ message, onRemove }: Readonly<Props>) {
  return (
    <li className="group flex items-center justify-center gap-1 px-6">
      <p className="min-w-0 truncate text-center text-xs text-muted-foreground" title={message.text}>
        {message.text}
      </p>
      <ChatDeleteButton
        text={message.text}
        onDelete={() => {
          onRemove(message.id);
        }}
      />
    </li>
  );
}
