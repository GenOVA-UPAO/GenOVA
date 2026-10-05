import { useTranslation } from "react-i18next";

import type { ChatRegeneration } from "../../hooks/use-chat-regeneration";
import { useOvaLatestJob } from "../../hooks/use-ova-latest-job";
import { useOvaWorkspace } from "../../hooks/use-ova-workspace";
import { phaseMeta } from "../../lib/phase-meta";
import { addedResourceRegenPayload, buttonRegenPayload } from "../../lib/regen-chat";
import type { PhaseWithContent } from "../../lib/types";
import { sectionTypes } from "../../lib/workspace-sections";
import { WorkspaceResourceList } from "./workspace-resource-list";

interface Props {
  ovaId: string;
  phases: PhaseWithContent[];
  regen: ChatRegeneration;
}

/** Pestaña «Editar»: una sección por fase con sus recursos y «Añadir recurso». */
export function WorkspaceEditSections({ ovaId, phases, regen }: Readonly<Props>) {
  const { t } = useTranslation();
  const workspace = useOvaWorkspace(ovaId);
  const latestJob = useOvaLatestJob(ovaId);
  const configured = (latestJob.data?.resources ?? []).map((resource) => resource.phase_type);
  const handleGroupReorder = (phaseType: string, group: PhaseWithContent[]) => {
    let index = 0;
    const reordered = phases.map((phase) =>
      phase.phase_type === phaseType ? group[index++] : phase,
    );
    workspace.reorder.mutate(
      reordered.map((phase, order) => ({ phase_id: phase.id, new_order: order })),
    );
  };
  return sectionTypes(phases, configured).map((phaseType) => (
    <WorkspaceResourceList
      key={phaseType}
      ovaId={ovaId}
      phaseType={phaseType}
      phases={phases.filter((phase) => phase.phase_type === phaseType)}
      busy={regen.busy}
      onReorder={(group) => {
        handleGroupReorder(phaseType, group);
      }}
      onRegenerate={(phase) => {
        if (!regen.busy)
          regen.request.mutate(buttonRegenPayload(phases, t("workspace:regenerar_recurso"), [phase.id]));
      }}
      onAdded={(phase, instructions) => {
        // Sin esto el recurso se quedaba con el marcador «pendiente de
        // regeneración» hasta que el docente pulsara «Regenerar recurso».
        regen.request.mutate(
          addedResourceRegenPayload(phaseMeta(phaseType).label || phaseType, instructions, phase.id),
        );
      }}
    />
  ));
}
