import { useState } from "react";

import type { AdminCatalogItem } from "../hooks/admin-llm-view";
import { useLlmSettings } from "../hooks/use-llm-settings";
import type { SlotIssue } from "../lib/chain-validation";
import { type Draft, isMediaTask, type TaskDraft } from "../lib/llm-config-draft";
import { enabledOnly, includeSelectedInPool, modelsForTask } from "../lib/task-model-pool";
import { ModelsOverviewBar } from "./models-overview-bar";
import { ModelsTaskNav } from "./models-task-nav";
import { ModelsTaskPanel } from "./models-task-panel";

interface ModelsMasterDetailProps {
  tasks: string[];
  draft: Draft | null;
  adminModels: AdminCatalogItem[];
  isAdmin: boolean;
  adminSaving: boolean;
  chainIssues: Record<string, SlotIssue[]>;
  onDraftChange: (next: Draft) => void;
  onOpenCatalog: () => void;
  /** Lleva a la clave de plataforma del proveedor (solo administradores). */
  onConnectProvider: (provider: string) => void;
  onGoToCredentials: () => void;
}

export function ModelsMasterDetail({
  tasks,
  draft,
  adminModels,
  isAdmin,
  adminSaving,
  chainIssues,
  onDraftChange,
  onOpenCatalog,
  onConnectProvider,
  onGoToCredentials,
}: Readonly<ModelsMasterDetailProps>) {
  const store = useLlmSettings();
  const [selectedTask, setSelectedTask] = useState(tasks[0] ?? "texto");
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const selectedDraft = draft?.[selectedTask];
  const generationOn = generationEnabled(selectedDraft, selectedTask);
  return (
    <div className="space-y-4">
      <ModelsOverviewBar
        isAdmin={isAdmin}
        onOpenCatalog={onOpenCatalog}
        onConnectProvider={onConnectProvider}
      />
      <div className="grid overflow-hidden rounded-xl border border-border bg-card md:grid-cols-[260px_1fr]">
        <ModelsTaskNav
          tasks={tasks}
          selectedTask={selectedTask}
          draft={draft}
          adminModels={adminModels}
          defaults={store.defaults}
          hidden={mobileShowDetail}
          onSelect={(task) => {
            setSelectedTask(task);
            setMobileShowDetail(true);
            revealPanel(task);
          }}
        />
        <ModelsTaskPanel
          task={selectedTask}
          hidden={!mobileShowDetail}
          isAdmin={isAdmin}
          adminSaving={adminSaving}
          generationOn={generationOn}
          selectedDraft={selectedDraft}
          poolModels={poolFor(selectedTask, adminModels, store.enabledModels, selectedDraft)}
          adminModels={adminModels}
          issues={chainIssues[selectedTask] ?? []}
          defaults={store.defaults}
          hasOwnLlmKey={store.hasOwnLlmKey}
          saving={store.saving}
          bounds={store.bounds}
          onBack={() => {
            setMobileShowDetail(false);
          }}
          onGoToCredentials={onGoToCredentials}
          onToggleGeneration={() => {
            toggleGeneration(draft, selectedTask, generationOn, onDraftChange);
          }}
          onChainChange={(next) => {
            applyChain(draft, selectedTask, next, onDraftChange);
          }}
        />
      </div>
    </div>
  );
}

function generationEnabled(draft: TaskDraft | undefined, task: string): boolean {
  if (typeof draft?.generationEnabled === "boolean") return draft.generationEnabled;
  return task !== "video";
}

function poolFor(
  task: string,
  adminModels: AdminCatalogItem[],
  enabled: { provider: string; model_id: string }[],
  selected: TaskDraft | undefined,
) {
  const enabledPool = enabledOnly(adminModels, enabled);
  const filtered = modelsForTask(enabledPool, task);
  // Imagen y video no pueden caer a modelos de texto (fallarían al generar): si
  // no hay ninguno activado, se ofrecen los aptos del catálogo completo.
  const fallback = isMediaTask(task) ? modelsForTask(adminModels, task) : enabledPool;
  const base = filtered.length ? filtered : fallback;
  return includeSelectedInPool(base, adminModels, [selected?.default, ...(selected?.fallbacks ?? [])]);
}

function applyChain(
  draft: Draft | null,
  task: string,
  next: TaskDraft,
  onDraftChange: (next: Draft) => void,
): void {
  if (!draft) return;
  const prev = draft[task] ?? { default: { provider: "", model_id: "" }, fallbacks: [] };
  onDraftChange({ ...draft, [task]: { ...prev, ...next } });
}

function toggleGeneration(
  draft: Draft | null,
  task: string,
  current: boolean,
  onDraftChange: (next: Draft) => void,
): void {
  if (!draft || !isMediaTask(task)) return;
  const prev = draft[task] ?? {
    default: { provider: "", model_id: "" },
    fallbacks: [],
    generationEnabled: task !== "video",
  };
  onDraftChange({ ...draft, [task]: { ...prev, generationEnabled: !current } });
}

/**
 * En móvil el panel sustituye a la lista, pero quedaba bajo el aviso de
 * proveedores y fuera de pantalla: se lleva a la vista y se le da el foco.
 */
function revealPanel(task: string) {
  if (typeof window.matchMedia !== "function") return;
  if (window.matchMedia("(min-width: 768px)").matches) return;
  requestAnimationFrame(() => {
    const panel = document.getElementById(`task-panel-${task}`);
    panel?.scrollIntoView({ block: "start", behavior: "smooth" });
    panel?.focus({ preventScroll: true });
  });
}
