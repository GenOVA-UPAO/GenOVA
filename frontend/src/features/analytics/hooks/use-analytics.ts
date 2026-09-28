import { useQuery } from "@tanstack/react-query";

import { HttpError } from "@/core/lib/http";

import { analyticsApi } from "../api/analytics.api";
import type { AnalyticsData } from "../lib/types";

export const analyticsKeys = {
  all: ["analytics"] as const,
};

export function isForbiddenError(error: unknown): boolean {
  if (error instanceof HttpError && error.status === 403) {
    return true;
  }
  if (typeof error === "object" && error !== null) {
    const maybeCode = (error as { code?: unknown }).code;
    const maybeStatus = (error as { status?: unknown }).status;
    return maybeCode === "forbidden" || maybeStatus === 403;
  }
  return false;
}

export function useAnalytics() {
  return useQuery<AnalyticsData>({
    queryKey: analyticsKeys.all,
    queryFn: () => analyticsApi.getAnalytics(),
    retry: (failureCount, error) => {
      if (isForbiddenError(error)) {
        return false;
      }
      return failureCount < 2;
    },
  });
}
