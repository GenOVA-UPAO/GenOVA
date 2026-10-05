import { lazy, Suspense, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAllPhaseResources } from "../../hooks/use-phase-resources";
import type { Resource } from "../../lib/ova-types";
import {
  type PhaseResourceMap,
  type ResourceConfigs,
  toggleSelection,
} from "../../lib/phase-select.config";
import { resourceDisplayName } from "../../lib/resource-display-name";
import { WorkspaceModal } from "../shared/workspace-modal";
import { PhaseSelectFooter } from "./phase-select-footer";
import { PhaseSelectGrid } from "./phase-select-grid";
import { PhaseSelectTabs } from "./phase-select-tabs";

const ResourceConfigModal = lazy(() => import("./resource-config-modal"));

interface Props {
  picks: PhaseResourceMap;
  configs: ResourceConfigs;
  onConfirm: (picks: PhaseResourceMap, configs: ResourceConfigs) => void;
  onClose: () => void;
}

export default function PhaseSelectModal({ picks, configs, onConfirm, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(picks);
  const [settings, setSettings] = useState(configs);
  const [phase, setPhase] = useState("engage");
  const [preview, setPreview] = useState<Resource>();
  const [target, setTarget] = useState<Resource>();
  const catalog = useAllPhaseResources();
  const selected = draft[phase] ?? [];
  const count = Object.values(draft).flat().length;
  const phases = Object.values(draft).filter((items) => items.length > 0).length;
  return (
    <WorkspaceModal
      title={t("workspace:configurar_recursos_5e")}
      size="xl"
      description={t("workspace:elige_que_recursos_generara_la_ia_en_cada_fas_63f3f9")}
      onClose={onClose}
      footer={
        <PhaseSelectFooter
          count={count}
          phases={phases}
          onClose={onClose}
          onConfirm={() => {
            onConfirm(draft, settings);
          }}
        />
      }
    >
      <PhaseSelectTabs
        phase={phase}
        picks={draft}
        onChange={(key) => {
          setPhase(key);
          setPreview(undefined);
        }}
      />
      <PhaseSelectGrid
        phase={phase}
        items={catalog.data?.[phase] ?? []}
        isPending={catalog.isPending}
        isFetching={catalog.isFetching}
        isError={catalog.isError}
        selected={selected}
        onSelect={(resource) => {
          setDraft({ ...draft, [phase]: toggleSelection(selected, resource) });
        }}
        onPreview={setPreview}
        onConfigure={setTarget}
        onReload={() => {
          void catalog.refetch();
        }}
        preview={preview ?? selected.at(-1) ?? catalog.data?.[phase].at(0)}
      />
      {target && (
        <Suspense>
          <ResourceConfigModal
            phase={phase}
            resourceId={String(target.id)}
            resourceName={target.tipo ? resourceDisplayName(target.tipo) : undefined}
            config={settings[`${phase}:${String(target.id)}`]}
            onSave={(value) => {
              setSettings({ ...settings, [`${phase}:${String(target.id)}`]: value });
            }}
            onClose={() => {
              setTarget(undefined);
            }}
          />
        </Suspense>
      )}
    </WorkspaceModal>
  );
}
