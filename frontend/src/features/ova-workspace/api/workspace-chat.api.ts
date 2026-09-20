import { apiJson } from "@/core/lib/http";

import type { RegenChatMessage } from "../lib/regen-chat";

interface ApiChatMessage {
  id: string;
  role: string;
  kind?: string;
  text: string;
  status?: string | null;
  percentage?: number | null;
  resource_labels?: string[];
  created_at?: string | null;
}

function toPayload(message: RegenChatMessage): Omit<ApiChatMessage, "created_at"> {
  return {
    id: message.id,
    role: message.role,
    kind: message.kind,
    text: message.text,
    status: message.status ?? null,
    percentage: message.percentage ?? null,
    resource_labels: message.resourceLabels ?? [],
  };
}

export function fetchWorkspaceChat(ovaId: string): Promise<{ messages?: ApiChatMessage[] }> {
  return apiJson(`/api/ovas/${ovaId}/chat`);
}

export function createWorkspaceChatMessage(ovaId: string, message: RegenChatMessage): Promise<unknown> {
  return apiJson(`/api/ovas/${ovaId}/chat`, { method: "POST", body: JSON.stringify(toPayload(message)) });
}

export function updateWorkspaceChatMessage(ovaId: string, message: RegenChatMessage): Promise<unknown> {
  return apiJson(`/api/ovas/${ovaId}/chat/${message.id}`, { method: "PATCH", body: JSON.stringify(toPayload(message)) });
}

export function deleteWorkspaceChatMessage(ovaId: string, messageId: string): Promise<unknown> {
  return apiJson(`/api/ovas/${ovaId}/chat/${messageId}`, { method: "DELETE" });
}

export function clearWorkspaceChat(ovaId: string): Promise<unknown> {
  return apiJson(`/api/ovas/${ovaId}/chat`, { method: "DELETE" });
}

export type { ApiChatMessage };
