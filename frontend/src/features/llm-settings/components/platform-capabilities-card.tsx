import type { EngineNode } from "../hooks/nodes-config.types";
import { useNodesConfig } from "../hooks/use-nodes-config";
import { CapabilitiesBody } from "./capabilities-body";
import { SaveCardButton } from "./save-card-button";

export function PlatformCapabilitiesCard() {
  const nodes = useNodesConfig();
  const capabilities = nodes.data.capabilities ?? [];
  const configurable = capabilities.filter((item) => item.configurable);
  const videoWarning = !nodes.data.video_api_key_configured;
  const hasChanges = capabilityDirty(configurable, nodes.draft, nodes.data.config);

  return (
    <section className="glass-card space-y-6 rounded-3xl p-6 sm:p-8" data-testid="platform-capabilities">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Capacidades de generación</h2>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            Módulos auxiliares invocados por los agentes durante la generación.
          </p>
        </div>
        <SaveCardButton
          disabled={!hasChanges}
          saving={nodes.saving}
          onClick={() => {
            void nodes.save(capabilityPayload(configurable, nodes.draft), "Capacidades guardadas.");
          }}
        />
      </div>
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
    </section>
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
