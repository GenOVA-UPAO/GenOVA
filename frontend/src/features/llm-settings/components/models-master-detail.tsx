import { useState } from "react";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import type { AdminCatalogItem } from "../hooks/admin-llm-view";
import { useLlmSettings } from "../hooks/use-llm-settings";
import type { SlotIssue } from "../lib/chain-validation";
import { type Draft, isMediaTask, type TaskDraft } from "../lib/llm-config-draft";
import { enabledOnly, includeSelectedInPool, modelsForTask } from "../lib/task-model-pool";
import { CatalogStatusAlert } from "./catalog-status-alert";
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
}: Readonly<ModelsMasterDetailProps>) {
  const store = useLlmSettings();
  const [selectedTask, setSelectedTask] = useState(tasks[0] ?? "texto");
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const selectedDraft = draft?.[selectedTask];
  const generationOn = generationEnabled(selectedDraft, selectedTask);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Elige una tarea para ver su modelo principal y sus modelos de respaldo.
        </p>
        <Button variant="outline" onClick={onOpenCatalog} className="shrink-0 max-sm:h-11">
          <Icon name="squares-four" size="text-sm" />
          Abrir catálogo
        </Button>
      </div>
      <CatalogStatusAlert
        catalogStatus={store.catalogStatus}
        refreshing={store.refreshingCatalog}
        onRetry={() => {
          void store.retryRefresh();
        }}
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
  const base = filtered.length ? filtered : enabledPool;
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
