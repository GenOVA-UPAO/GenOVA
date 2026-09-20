import { Link } from "react-router";

import { Button } from "@/core/components/ui/button";
import { HttpError } from "@/core/lib/http";

import { useOvaWorkspace } from "../../hooks/use-ova-workspace";
import type { PhaseWithContent } from "../../lib/types";
import { OvaGeneratingPanel } from "./ova-generating-panel";
import { WorkspaceChatPanel } from "./workspace-chat-panel";
import { WorkspaceOvaPanel } from "./workspace-ova-panel";
import { WorkspaceSplitView } from "./workspace-split-view";

function isGenerating(error: Error | null) {
  return error instanceof HttpError && error.status === 409;
}

export function OvaEditView({ ovaId }: Readonly<{ ovaId: string }>) {
  const workspace = useOvaWorkspace(ovaId);
  const phases = (workspace.data?.current_version?.phases ?? []) as PhaseWithContent[];
  const title = workspace.data?.title ?? "Mi OVA";
  if (workspace.isPending)
    return (
      <p role="status" className="p-6">
        Cargando OVA…
      </p>
    );
  if (isGenerating(workspace.error))
    return (
      <OvaGeneratingPanel
        ovaId={ovaId}
        onReady={() => {
          void workspace.refetch();
        }}
      />
    );
  if (workspace.error)
    return (
      <div className="p-6">
        <p role="alert">{workspace.error.message}</p>
        <Button
          onClick={() => {
            void workspace.refetch();
          }}
        >
          Reintentar
        </Button>
      </div>
    );
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-background">
      <header className="flex shrink-0 items-center gap-4 border-b bg-card p-4">
        <Link to="/mis-ovas">← Mis OVAs</Link>
        <h1 className="min-w-0 flex-1 truncate font-display text-xl font-semibold" title={title}>
          {title}
        </h1>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-sm">v{workspace.data.current_version?.version_number}</span>
      </header>
      <WorkspaceSplitView
        chat={<WorkspaceChatPanel ovaId={ovaId} phases={phases} />}
        preview={<WorkspaceOvaPanel ovaId={ovaId} phases={phases} />}
      />
    </div>
  );
}
