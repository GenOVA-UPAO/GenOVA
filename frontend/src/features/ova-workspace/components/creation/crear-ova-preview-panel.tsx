import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { fetchJobResourceContent, type ResourceContent } from "../../api/ova-jobs.api";
import type { ResourceVM } from "../../lib/ova-job-view-model";
import { phaseMeta } from "../../lib/phase-meta";
import { PreviewPanelBody } from "./preview-panel-body";
import { PreviewPanelTabs } from "./preview-panel-tabs";

interface Props {
  jobId: string | null;
  viewModel: ResourceVM[];
  pinnedId: string | null;
  onPin: (id: string | null) => void;
}

function pickActive(done: ResourceVM[], tabId: string | undefined, pinnedId: string | null): ResourceVM | undefined {
  for (const id of [tabId, pinnedId ?? undefined]) {
    const found = done.find((resource) => resource.id === id);
    if (found) return found;
  }
  return done.at(0);
}

function resourceHtml(data: ResourceContent & { html?: string }): string {
  if (Object.hasOwn(data, "html")) return data.html ?? "";
  return data.content;
}

export default function CrearOvaPreviewPanel({ jobId, viewModel, pinnedId, onPin }: Readonly<Props>) {
  const [tabId, setTabId] = useState<string>();
  const doneTabs = viewModel.filter((resource) => resource.status === "check");
  const pendingTabs = viewModel.filter((resource) => resource.status !== "check" && resource.status !== "X");
  const active = pickActive(doneTabs, tabId, pinnedId);
  const content = useQuery({
    queryKey: ["ova-job-resource", jobId, active?.id],
    queryFn: () => fetchJobResourceContent(jobId ?? "", active?.id ?? ""),
    enabled: Boolean(jobId && active?.id),
  });
  const html = content.data ? resourceHtml(content.data) : "";
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      {viewModel.length > 0 && (
        <PreviewPanelTabs
          done={doneTabs}
          pending={pendingTabs}
          activeId={active?.id}
          onSelect={(id) => {
            setTabId(id);
            onPin(id);
          }}
        />
      )}
      <div className="min-h-0 flex-1 overflow-hidden">
        <PreviewPanelBody active={active} loading={content.isPending} html={html} />
      </div>
      {active && (
        <div className="flex min-w-0 shrink-0 items-center gap-2 border-t border-border bg-muted/20 px-3 py-1">
          <span className="shrink-0 rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
            {phaseMeta(active.phase).label || active.phase}
          </span>
          <span className="truncate text-xs text-muted-foreground">{active.label}</span>
        </div>
      )}
    </section>
  );
}
