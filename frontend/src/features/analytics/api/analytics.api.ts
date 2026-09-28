import { apiJson, HttpError } from "@/core/lib/http";

import type { AnalyticsData } from "../lib/types";

export const analyticsApi = {
  async getAnalytics(): Promise<AnalyticsData> {
    try {
      return await apiJson<AnalyticsData>("/api/users/analytics");
    } catch (err) {
      if (err instanceof HttpError && err.status === 403 && !err.code) {
        err.code = "forbidden";
      }
      throw err;
    }
  },
};
