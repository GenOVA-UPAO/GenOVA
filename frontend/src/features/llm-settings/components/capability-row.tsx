import type { EngineNode } from "../hooks/nodes-config.types";
import {
  MEDIA_STATE_LABELS,
  mediaStateTone,
  mediaStatusSentence,
  type MediaTaskStatus,
} from "../lib/media-status";
import { CapabilityControl } from "./capability-control";
import { SettingRow } from "./setting-row";

const TONE_CLASS = {
  success: "text-sm text-success-strong",
  warning: "text-sm text-accent-brand",
  muted: "text-sm text-muted-foreground",
} as const;

interface CapabilityRowProps {
  cap: EngineNode;
  active: boolean;
  saving: boolean;
  /** Estado real de imagen, video o narración (solo capacidades con `media_task`). */
  media?: MediaTaskStatus;
  onToggle: () => void;
}

export function CapabilityRow({ cap, active, saving, media, onToggle }: Readonly<CapabilityRowProps>) {
  const title = (
    <>
      {cap.name}
      {cap.role ? <span className="font-normal text-muted-foreground">{cap.role}</span> : null}
    </>
  );
  if (cap.media_task) {
    const state = media?.state;
    return (
      <SettingRow
        title={title}
        description={cap.description}
        control={
          <span className={TONE_CLASS[mediaStateTone(state)]}>
            {state ? MEDIA_STATE_LABELS[state] : "Sin datos"}
          </span>
        }
      >
        <p className="text-xs text-muted-foreground">{mediaStatusSentence(cap.media_task, media)}</p>
      </SettingRow>
    );
  }
  return (
    <SettingRow
      title={title}
      description={cap.description}
      control={<CapabilityControl cap={cap} active={active} saving={saving} onToggle={onToggle} />}
    />
  );
}
