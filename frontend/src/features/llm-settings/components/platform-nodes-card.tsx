import { useNodesConfig } from "../hooks/use-nodes-config";
import { hasUnsavedChanges } from "../lib/nodes-config-draft";
import { NodesCardBody } from "./nodes-card-body";
import { SaveCardButton } from "./save-card-button";

export function PlatformNodesCard() {
  const nodes = useNodesConfig();
  const list = nodes.data.nodes ?? [];
  const configurable = list.filter((item) => item.configurable);
  const alwaysOn = list.filter((item) => item.always_on && item.id !== "video");
  const videoNode = list.find((item) => item.id === "video");
  const videoWarning = !nodes.data.video_api_key_configured;
  const hasChanges = hasUnsavedChanges(nodes.draft, nodes.data.config, nodes.rounds);

  return (
    <section className="glass-card space-y-6 rounded-3xl p-6 sm:p-8" data-testid="platform-nodes">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Nodos del orquestador</h2>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            Activa o desactiva agentes del grafo de generación. Los cambios aplican en ~30s.
          </p>
        </div>
        <SaveCardButton
          disabled={!hasChanges}
          saving={nodes.saving}
          onClick={() => {
            if (!nodes.draft) return;
            void nodes.save(
              { ...nodes.draft, ova_reflection_rounds: String(nodes.rounds) },
              "Configuración de nodos guardada.",
            );
          }}
        />
      </div>
      <NodesCardBody
        loading={nodes.loading}
        error={nodes.error}
        ready={Boolean(nodes.draft)}
        configurable={configurable}
        alwaysOn={alwaysOn}
        videoNode={videoNode}
        videoWarning={videoWarning}
        nodes={nodes}
      />
    </section>
  );
}
