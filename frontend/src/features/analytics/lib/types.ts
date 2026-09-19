export interface Creator {
  user_id: string;
  name?: string;
  email: string;
  ova_count: number;
}

export interface RecentOva {
  id: string;
  title?: string;
  owner_name?: string;
  status: string;
  created_at?: string;
}

export interface AnalyticsTotals {
  ovas: number;
  users?: number;
  students?: number;
}

export interface AnalyticsData {
  scope?: string;
  totals: AnalyticsTotals;
  ova_by_status: Record<string, number>;
  top_creators: Creator[];
  recent_ovas: RecentOva[];
}
