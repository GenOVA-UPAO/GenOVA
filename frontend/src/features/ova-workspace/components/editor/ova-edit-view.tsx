import { useState } from "react";

import { HttpError } from "@/core/lib/http";

import { useOvaWorkspace } from "../../hooks/use-ova-workspace";
import type { PhaseWithContent } from "../../lib/types";
import { OvaGeneratingPanel } from "./ova-generating-panel";
import { WorkspaceChatPanel } from "./workspace-chat-panel";
import { WorkspaceHeader, type WorkspaceMobileView } from "./workspace-header";
import { WorkspaceLoadError } from "./workspace-load-error";
import { WorkspaceOvaPanel } from "./workspace-ova-panel";
import { WorkspaceSkeleton } from "./workspace-skeleton";
import { WorkspaceSplitView } from "./workspace-split-view";

function isGenerating(error: Error | null) {
  return error instanceof HttpError && error.status === 409;
}

export function OvaEditView({ ovaId }: Readonly<{ ovaId: string }>) {
  const workspace = useOvaWorkspace(ovaId);
  const [mobileView, setMobileView] = useState<WorkspaceMobileView>("chat");
  const phases = (workspace.data?.current_version?.phases ?? []) as PhaseWithContent[];
  const title = workspace.data?.title ?? "Mi OVA";
  if (workspace.isPending) return <WorkspaceSkeleton />;
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
      <WorkspaceLoadError
        message={workspace.error.message}
        onRetry={() => {
          void workspace.refetch();
        }}
      />
    );
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-background">
      <WorkspaceHeader
        ovaId={ovaId}
        title={title}
        version={workspace.data.current_version?.version_number}
        mobileView={mobileView}
        onMobileView={setMobileView}
      />
      <WorkspaceSplitView
        mobileView={mobileView}
        chat={<WorkspaceChatPanel ovaId={ovaId} phases={phases} />}
        preview={<WorkspaceOvaPanel ovaId={ovaId} phases={phases} />}
      />
    </div>
  );
}
