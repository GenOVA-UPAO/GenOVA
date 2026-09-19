import type { EngineNode } from "../hooks/nodes-config.types";
import { CapabilityRow } from "./capability-row";

interface CapabilitiesBodyProps {
  loading: boolean;
  error: string;
  ready: boolean;
  capabilities: EngineNode[];
  draft: Record<string, string> | null;
  saving: boolean;
  videoWarning: boolean;
  onToggle: (flag: string) => void;
}

export function CapabilitiesBody({
  loading,
  error,
  ready,
  capabilities,
  draft,
  saving,
  videoWarning,
  onToggle,
}: Readonly<CapabilitiesBodyProps>) {
  if (loading || !ready) {
    return (
      <div className="space-y-3">
        <div className="h-16 animate-pulse rounded-2xl bg-muted" />
        <div className="h-16 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }
  if (error) {
    return (
      <p className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm font-bold text-destructive">
        {error}
      </p>
    );
  }
  return (
    <div className="glass-card overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      {capabilities.map((cap) => (
        <CapabilityRow
          key={cap.id}
          cap={cap}
          active={draft?.[cap.flag] === "1"}
          saving={saving}
          videoWarning={videoWarning}
          onToggle={() => {
            onToggle(cap.flag);
          }}
        />
      ))}
    </div>
  );
}
