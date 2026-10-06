import type { RegenChatMessage } from "../../lib/regen-chat";
import type { RegenCancel } from "./cancel-regen-button";
import { ChatAssistantMessage } from "./chat-assistant-message";
import { ChatSystemMessage } from "./chat-system-message";
import { ChatUserMessage } from "./chat-user-message";

interface Props {
  message: RegenChatMessage;
  onRemove: (id: string) => void;
  cancel?: RegenCancel;
}

export function ChatMessageItem({ message, onRemove, cancel }: Readonly<Props>) {
  if (message.role === "system") {
    return <ChatSystemMessage message={message} onRemove={onRemove} />;
  }
  if (message.role === "user") {
    return <ChatUserMessage message={message} onRemove={onRemove} />;
  }
  return <ChatAssistantMessage message={message} onRemove={onRemove} cancel={cancel} />;
}
