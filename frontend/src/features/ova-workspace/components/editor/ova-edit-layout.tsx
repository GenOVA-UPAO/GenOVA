import { useState } from "react";

import type { ChatRegeneration } from "../../hooks/use-chat-regeneration";
import type { PhaseWithContent } from "../../lib/types";
import { WorkspaceChatPanel } from "./workspace-chat-panel";
import { WorkspaceHeader, type WorkspaceMobileView } from "./workspace-header";
import { WorkspaceOvaPanel } from "./workspace-ova-panel";
import { WorkspaceReadOnlyNotice } from "./workspace-read-only-notice";
import { WorkspaceSplitView } from "./workspace-split-view";

interface Props {
  ovaId: string;
  title: string;
  version: number | undefined;
  /** El OVA es de otra persona: solo la vista previa, sin instrucciones ni edición. */
  readOnly: boolean;
  phases: PhaseWithContent[];
  regen: ChatRegeneration;
}

/** Editor ya cargado: instrucciones y OVA lado a lado, o solo el OVA en lectura. */
export function OvaEditLayout({ ovaId, title, version, readOnly, phases, regen }: Readonly<Props>) {
  const [mobileView, setMobileView] = useState<WorkspaceMobileView>("chat");
  const ovaPanel = (
    <WorkspaceOvaPanel ovaId={ovaId} phases={phases} regen={regen} readOnly={readOnly} />
  );
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-background">
      <WorkspaceHeader
        ovaId={ovaId}
        title={title}
        version={version}
        mobileView={mobileView}
        onMobileView={setMobileView}
        readOnly={readOnly}
      />
      {readOnly ? (
        <>
          <WorkspaceReadOnlyNotice />
          <div className="min-h-0 min-w-0 flex-1">{ovaPanel}</div>
        </>
      ) : (
        <WorkspaceSplitView
          mobileView={mobileView}
          chat={<WorkspaceChatPanel phases={phases} regen={regen} />}
          preview={ovaPanel}
        />
      )}
    </div>
  );
}
