import type { RegenChatMessage } from "../../lib/regen-chat";
import { ChatAssistantMessage } from "./chat-assistant-message";
import { ChatSystemMessage } from "./chat-system-message";
import { ChatUserMessage } from "./chat-user-message";

interface Props {
  message: RegenChatMessage;
  onRemove: (id: string) => void;
}

export function ChatMessageItem({ message, onRemove }: Readonly<Props>) {
  if (message.role === "system") {
    return <ChatSystemMessage message={message} onRemove={onRemove} />;
  }
  if (message.role === "user") {
    return <ChatUserMessage message={message} onRemove={onRemove} />;
  }
  return <ChatAssistantMessage message={message} onRemove={onRemove} />;
}
