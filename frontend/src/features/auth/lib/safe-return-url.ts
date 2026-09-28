const DASHBOARD = "/dashboard";

export function safeReturnUrl(raw: string | null): string {
  if (!raw?.startsWith("/") || raw.startsWith("//") || raw.includes("://")) {
    return DASHBOARD;
  }
  return raw;
}
