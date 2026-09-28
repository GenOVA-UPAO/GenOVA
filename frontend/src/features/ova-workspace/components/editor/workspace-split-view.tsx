import { type CSSProperties, type ReactNode, useRef, useState } from "react";

import type { WorkspaceMobileView } from "./workspace-header";
import { WorkspaceResizableDivider } from "./workspace-resizable-divider";

interface Props {
  chat: ReactNode;
  preview: ReactNode;
  /** En móvil solo se ve una columna; en escritorio, las dos. */
  mobileView: WorkspaceMobileView;
}

export function WorkspaceSplitView({ chat, preview, mobileView }: Readonly<Props>) {
  const [ratio, setRatio] = useState(35);
  const container = useRef<HTMLDivElement>(null);
  const resize = (value: number) => { setRatio(Math.min(65, Math.max(25, value))); };
  const style = { "--workspace-columns": `${String(ratio)}% 6px minmax(0, 1fr)` } as CSSProperties;
  return (
    <div ref={container} className="grid min-h-0 min-w-0 flex-1 md:grid-cols-[var(--workspace-columns)]" style={style}>
      <div id="workspace-chat-column" className={mobileView === "chat" ? "min-h-0 min-w-0" : "hidden min-h-0 min-w-0 md:block"}>{chat}</div>
      <WorkspaceResizableDivider container={container} ratio={ratio} onChange={resize} />
      <div id="workspace-ova-column" className={mobileView === "ova" ? "min-h-0 min-w-0" : "hidden min-h-0 min-w-0 md:block"}>{preview}</div>
    </div>
  );
}
