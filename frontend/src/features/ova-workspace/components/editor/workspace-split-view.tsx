import { type CSSProperties, type ReactNode,useRef, useState } from "react";

import { Button } from "@/core/components/ui/button";

import { WorkspaceResizableDivider } from "./workspace-resizable-divider";

export function WorkspaceSplitView({ chat, preview }: Readonly<{ chat: ReactNode; preview: ReactNode }>) {
  const [mobileTab, setMobileTab] = useState("chat");
  const [ratio, setRatio] = useState(35);
  const container = useRef<HTMLDivElement>(null);
  const resize = (value: number) => { setRatio(Math.min(65, Math.max(25, value))); };
  const style = { "--workspace-columns": `${String(ratio)}% 6px minmax(0, 1fr)` } as CSSProperties;
  return (
    <div className="min-w-0 flex-1">
      <div role="tablist" aria-label="Vista del workspace" className="flex gap-2 p-3 md:hidden">
        <Button role="tab" aria-selected={mobileTab === "chat"} variant="outline" onClick={() => { setMobileTab("chat"); }}>
          Chat
        </Button>
        <Button role="tab" aria-selected={mobileTab === "preview"} variant="outline" onClick={() => { setMobileTab("preview"); }}>
          Preview / Code
        </Button>
      </div>
      <div ref={container} className="grid min-w-0 md:grid-cols-[var(--workspace-columns)]" style={style}>
        <div className={mobileTab === "chat" ? "min-w-0" : "hidden min-w-0 md:block"}>{chat}</div>
        <WorkspaceResizableDivider container={container} ratio={ratio} onChange={resize} />
        <div className={mobileTab === "preview" ? "min-w-0" : "hidden min-w-0 md:block"}>{preview}</div>
      </div>
    </div>
  );
}
