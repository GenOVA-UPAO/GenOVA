import type { EngineNode } from "../hooks/nodes-config.types";
import { useNodesConfig } from "../hooks/use-nodes-config";
import { CapabilitiesBody } from "./capabilities-body";
import { PlatformSection } from "./platform-section";
import { SaveCardButton } from "./save-card-button";

export function PlatformCapabilitiesCard() {
  const nodes = useNodesConfig();
  const capabilities = nodes.data.capabilities ?? [];
  const configurable = capabilities.filter((item) => item.configurable);
  const videoWarning = !nodes.data.video_api_key_configured;
  const hasChanges = capabilityDirty(configurable, nodes.draft, nodes.data.config);

  return (
    <PlatformSection
      testId="platform-capabilities"
      title="Capacidades de generación"
      description="Módulos auxiliares que los agentes usan mientras generan un OVA."
      action={
        <SaveCardButton
          disabled={!hasChanges}
          saving={nodes.saving}
          onClick={() => {
            void nodes.save(capabilityPayload(configurable, nodes.draft), "Capacidades guardadas.");
          }}
        />
      }
    >
      <CapabilitiesBody
        loading={nodes.loading}
        error={nodes.error}
        ready={Boolean(nodes.draft)}
        capabilities={capabilities}
        draft={nodes.draft}
        saving={nodes.saving}
        videoWarning={videoWarning}
        onToggle={nodes.toggleFlag}
      />
    </PlatformSection>
  );
}

function readFlag(
  map: Record<string, string> | undefined,
  flag: string,
  fallback: string | undefined,
  empty: string,
): string {
  if (map && Object.hasOwn(map, flag)) return map[flag];
  return fallback ?? empty;
}

function capabilityDirty(
  caps: EngineNode[],
  draft: Record<string, string> | null,
  config: Record<string, string> | undefined,
): boolean {
  if (!draft) return false;
  return caps.some((item) => {
    const current = readFlag(draft, item.flag, item.default, "");
    const saved = readFlag(config, item.flag, item.default, "");
    return current !== saved;
  });
}

function capabilityPayload(
  caps: EngineNode[],
  draft: Record<string, string> | null,
): Record<string, string> {
  const updates: Record<string, string> = {};
  for (const item of caps) {
    updates[item.flag] = readFlag(draft ?? undefined, item.flag, item.default, "0");
  }
  return updates;
}
