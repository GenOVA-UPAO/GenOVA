import { lazy, Suspense, useState } from "react";

import { Button } from "@/core/components/ui/button";

import { useAllPhaseResources } from "../../hooks/use-phase-resources";
import type { Resource } from "../../lib/ova-types";
import {
  MAX_PER_PHASE,
  PHASE_SELECT_CFG,
  type PhaseResourceMap,
  type ResourceConfigs,
  toggleSelection,
} from "../../lib/phase-select.config";
import { WorkspaceModal } from "../shared/workspace-modal";
import { PhaseSelectGrid } from "./phase-select-grid";

const ResourceConfigModal = lazy(() => import("./resource-config-modal"));

interface Props {
  picks: PhaseResourceMap;
  configs: ResourceConfigs;
  onConfirm: (picks: PhaseResourceMap, configs: ResourceConfigs) => void;
  onClose: () => void;
}

export default function PhaseSelectModal({ picks, configs, onConfirm, onClose }: Readonly<Props>) {
  const [draft, setDraft] = useState(picks);
  const [settings, setSettings] = useState(configs);
  const [phase, setPhase] = useState("engage");
  const [preview, setPreview] = useState<Resource>();
  const [target, setTarget] = useState<Resource>();
  const catalog = useAllPhaseResources();
  const selected = draft[phase] ?? [];
  const count = Object.values(draft).flat().length;
  const valid = Object.values(draft).filter((items) => items.length > 0).length >= 2;
  return (
    <WorkspaceModal title="Configurar recursos 5E" onClose={onClose}>
      <nav className="flex flex-wrap gap-2" aria-label="Fases">
        {PHASE_SELECT_CFG.map((item) => (
          <Button
            key={item.key}
            variant={phase === item.key ? "default" : "outline"}
            onClick={() => {
              setPhase(item.key);
              setPreview(undefined);
            }}
          >
            {item.label} ({draft[item.key].length})
          </Button>
        ))}
      </nav>
      <p>Hasta {MAX_PER_PHASE} recursos por fase. Selecciona al menos 2 fases.</p>
      <PhaseSelectGrid
        phase={phase}
        items={catalog.data?.[phase] ?? []}
        isPending={catalog.isPending}
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
      <footer className="flex justify-between">
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          disabled={!valid}
          onClick={() => {
            onConfirm(draft, settings);
          }}
        >
          Confirmar ({count})
        </Button>
      </footer>
      {target && (
        <Suspense>
          <ResourceConfigModal
            phase={phase}
            resourceId={String(target.id)}
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
