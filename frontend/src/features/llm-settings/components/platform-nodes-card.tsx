import { useTranslation } from "react-i18next";

import { useNodesConfig } from "../hooks/use-nodes-config";
import { hasUnsavedChanges } from "../lib/nodes-config-draft";
import { NodesCardBody } from "./nodes-card-body";
import { PlatformSection } from "./platform-section";
import { SaveCardButton } from "./save-card-button";

export function PlatformNodesCard() {
  const { t } = useTranslation("llm-settings");
  const nodes = useNodesConfig();
  const list = nodes.data.nodes ?? [];
  const configurable = list.filter((item) => item.configurable);
  const alwaysOn = list.filter((item) => item.always_on);
  const hasChanges = hasUnsavedChanges(nodes.draft, nodes.data.config, nodes.rounds);

  return (
    <PlatformSection
      testId="platform-nodes"
      title={t("nodes.title")}
      description={t("nodes.description")}
      action={
        <SaveCardButton
          disabled={!hasChanges}
          saving={nodes.saving}
          onClick={() => {
            if (!nodes.draft) return;
            void nodes.save(
              { ...nodes.draft, ova_reflection_rounds: String(nodes.rounds) },
              t("nodes.saved"),
            );
          }}
        />
      }
    >
      <NodesCardBody
        loading={nodes.loading}
        error={nodes.error}
        ready={Boolean(nodes.draft)}
        configurable={configurable}
        alwaysOn={alwaysOn}
        nodes={nodes}
      />
    </PlatformSection>
  );
}
