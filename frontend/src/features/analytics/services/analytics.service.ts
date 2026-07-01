import { Injectable } from "@angular/core";
import { apiFetch } from "../../../core/lib/http";
import type { AnalyticsData } from "../lib/types";

@Injectable({
  providedIn: "root",
})
export class AnalyticsService {
  async getAnalytics(): Promise<AnalyticsData> {
    const res = await apiFetch("/api/users/analytics");
    if (res.status === 403) {
      const err = new Error("forbidden") as Error & { code?: string };
      err.code = "forbidden";
      throw err;
    }
    if (!res.ok) {
      throw new Error("No se pudieron cargar las analíticas.");
    }
    return res.json() as Promise<AnalyticsData>;
  }
}
