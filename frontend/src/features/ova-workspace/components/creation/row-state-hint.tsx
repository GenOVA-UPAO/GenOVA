import type { ResourceVM } from "../../lib/ova-job-view-model";

export function RowStateHint({
  status,
  canPreview,
}: Readonly<{ status: ResourceVM["status"]; canPreview: boolean }>) {
  if (status === "generando") {
    return <span className="shrink-0 text-xs text-primary">Generando…</span>;
  }
  if (status === "pendiente") {
    return <span className="shrink-0 text-xs text-muted-foreground">En cola</span>;
  }
  if (status === "check" && canPreview) {
    return <span className="shrink-0 text-xs text-primary">Ver</span>;
  }
  return null;
}
