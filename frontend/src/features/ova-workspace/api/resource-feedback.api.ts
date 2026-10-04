import { apiJson } from "@/core/lib/http";

import type { FeedbackRating,FeedbackReason } from "../lib/resource-feedback";

export interface ResourceFeedbackDto {
  phase_id: string;
  rating: FeedbackRating;
  reason: FeedbackReason | null;
  comment: string | null;
}

export interface FeedbackInput {
  rating: FeedbackRating;
  reason?: FeedbackReason | null;
  comment?: string | null;
}

export async function fetchResourceFeedback(ovaId: string): Promise<ResourceFeedbackDto[]> {
  const body = await apiJson<{ feedback?: ResourceFeedbackDto[] }>(`/api/ovas/${ovaId}/feedback`);
  return body.feedback ?? [];
}

export function putResourceFeedback(
  ovaId: string,
  phaseId: string,
  input: FeedbackInput,
): Promise<ResourceFeedbackDto> {
  return apiJson(`/api/ovas/${ovaId}/fases/${phaseId}/feedback`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteResourceFeedback(ovaId: string, phaseId: string): Promise<unknown> {
  return apiJson(`/api/ovas/${ovaId}/fases/${phaseId}/feedback`, { method: "DELETE" });
}
