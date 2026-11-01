import type { EngineNode, NodesConfigResponse } from "../hooks/nodes-config.types";
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
  mediaStatus: NodesConfigResponse["media_status"];
  onToggle: (flag: string) => void;
}

export function CapabilitiesBody({
  loading,
  error,
  ready,
  capabilities,
  draft,
  saving,
  mediaStatus,
  onToggle,
}: Readonly<CapabilitiesBodyProps>) {
  // El error va antes que «sin datos»: si la carga falla nunca hay borrador y
  // el esqueleto quedaba girando para siempre.
  if (error && !loading) {
    return <SectionError message={error} />;
  }
  if (loading || !ready) {
    return <SettingListSkeleton rows={4} />;
  }
  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
      {capabilities.map((cap) => (
        <CapabilityRow
          key={cap.id}
          cap={cap}
          active={draft?.[cap.flag] === "1"}
          saving={saving}
          media={cap.media_task ? mediaStatus?.[cap.media_task] : undefined}
          onToggle={() => {
            onToggle(cap.flag);
          }}
        />
      ))}
    </ul>
  );
}
