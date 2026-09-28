import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { clearWorkspaceChat, createWorkspaceChatMessage, deleteWorkspaceChatMessage, fetchWorkspaceChat, updateWorkspaceChatMessage } from "../api/workspace-chat.api";
import { fromApiMessage, type RegenChatMessage } from "../lib/regen-chat";

const chatKey = (ovaId: string) => ["ova-workspace-chat", ovaId] as const;

export function useWorkspaceChat(ovaId: string | undefined) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ovaId ? chatKey(ovaId) : ["ova-workspace-chat", "none"], queryFn: () => fetchWorkspaceChat(ovaId ?? ""), enabled: Boolean(ovaId), select: (data) => (data.messages ?? []).map(fromApiMessage) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: chatKey(ovaId ?? "") });
  const append = useMutation({ mutationFn: (message: RegenChatMessage) => createWorkspaceChatMessage(ovaId ?? "", message), onSuccess: refresh });
  const patch = useMutation({ mutationFn: (message: RegenChatMessage) => updateWorkspaceChatMessage(ovaId ?? "", message), onSuccess: refresh });
  const remove = useMutation({ mutationFn: (messageId: string) => deleteWorkspaceChatMessage(ovaId ?? "", messageId), onSuccess: refresh });
  const clear = useMutation({ mutationFn: () => clearWorkspaceChat(ovaId ?? ""), onSuccess: refresh });
  return { ...query, append, clear, patch, remove };
}
