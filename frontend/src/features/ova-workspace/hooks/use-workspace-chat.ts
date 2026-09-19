import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { clearWorkspaceChat, createWorkspaceChatMessage, deleteWorkspaceChatMessage, fetchWorkspaceChat, updateWorkspaceChatMessage } from "../api/workspace-chat.api";
import { fromApiMessage, patchChatMessage, type RegenChatMessage } from "../lib/regen-chat";

const chatKey = (ovaId: string) => ["ova-workspace-chat", ovaId] as const;

export function useWorkspaceChat(ovaId: string | undefined) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ovaId ? chatKey(ovaId) : ["ova-workspace-chat", "none"], queryFn: () => fetchWorkspaceChat(ovaId ?? ""), enabled: Boolean(ovaId), select: (data) => (data.messages ?? []).map(fromApiMessage) });
  const updateCache = (message: RegenChatMessage) => queryClient.setQueryData<RegenChatMessage[]>(chatKey(ovaId ?? ""), (messages = []) => patchChatMessage(messages, message.id, message));
  const append = useMutation({ mutationFn: (message: RegenChatMessage) => createWorkspaceChatMessage(ovaId ?? "", message), onSuccess: (_data, message) => queryClient.setQueryData<RegenChatMessage[]>(chatKey(ovaId ?? ""), (messages = []) => [...messages, message]) });
  const patch = useMutation({ mutationFn: (message: RegenChatMessage) => updateWorkspaceChatMessage(ovaId ?? "", message), onMutate: updateCache });
  const remove = useMutation({ mutationFn: (messageId: string) => deleteWorkspaceChatMessage(ovaId ?? "", messageId), onSuccess: (_data, messageId) => queryClient.setQueryData<RegenChatMessage[]>(chatKey(ovaId ?? ""), (messages = []) => messages.filter((message) => message.id !== messageId)) });
  const clear = useMutation({ mutationFn: () => clearWorkspaceChat(ovaId ?? ""), onSuccess: () => queryClient.setQueryData(chatKey(ovaId ?? ""), []) });
  return { ...query, append, clear, patch, remove };
}
