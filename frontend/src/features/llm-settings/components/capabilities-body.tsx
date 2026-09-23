import type { EngineNode } from "../hooks/nodes-config.types";
import { CapabilityRow } from "./capability-row";
import { SectionError } from "./section-error";
import { SettingListSkeleton } from "./setting-list-skeleton";

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
    return <SettingListSkeleton rows={2} />;
  }
  if (error) {
    return <SectionError message={error} />;
  }
  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
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
    </ul>
  );
}
