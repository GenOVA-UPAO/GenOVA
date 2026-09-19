import type { WireframeKind } from "../../lib/previews/preview-types";
import { WireframeGraph } from "./wireframe-graph";
import { WireframeLab } from "./wireframe-lab";
import { WireframeSketchDashboard } from "./wireframe-sketch-dashboard";
import { WireframeSketchDragdrop } from "./wireframe-sketch-dragdrop";

export function WireframeSketchesInteract({ kind }: Readonly<{ kind: WireframeKind }>) {
  const rows = [0, 1, 2];
  switch (kind) {
    case "chat":
      return (
        <div className="flex h-full flex-col justify-end gap-3">
          <div className="h-5 w-4/5 rounded-lg bg-current/20" />
          <div className="h-5 w-3/5 self-end rounded-lg bg-current" />
          <div className="h-5 w-2/3 rounded-lg bg-current/20" />
          <div className="h-6 rounded border" />
        </div>
      );
    case "decisions":
      return (
        <div className="flex h-full flex-col gap-3">
          <div className="flex-1 rounded border bg-current/10 p-3">
            <div className="h-2 w-4/5 bg-current/30" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded bg-current p-2 text-center text-background">A</div>
            <div className="rounded border p-2 text-center">B</div>
          </div>
        </div>
      );
    case "lab":
      return <WireframeLab />;
    case "dashboard":
      return <WireframeSketchDashboard />;
    case "code":
      return (
        <div className="flex h-full flex-col gap-2">
          <div className="flex-1 space-y-2 rounded border bg-current/5 p-3 font-mono">
            {[40, 80, 60, 75, 50].map((width) => (
              <div key={width} className="h-2 bg-current/30" style={{ width: `${String(width)}%` }} />
            ))}
          </div>
          <div className="w-16 self-end rounded bg-current text-center text-background">▶</div>
        </div>
      );
    case "graph":
      return <WireframeGraph />;
    case "matching":
      return (
        <div className="flex h-full gap-6">
          {[0, 1].map((column) => (
            <div key={column} className="flex flex-1 flex-col justify-center gap-3">
              {rows.map((row) => (
                <div key={row} className="h-6 rounded border border-current/50 bg-current/10" />
              ))}
            </div>
          ))}
        </div>
      );
    case "cardGrid":
      return (
        <div className="grid h-full grid-cols-2 gap-2">
          {[0, 1, 2, 3].map((id) => (
            <div key={id} className="rounded border bg-current/10 p-3">
              <span className="block h-3 w-3 bg-current" />
              <div className="mt-3 h-1 bg-current/30" />
            </div>
          ))}
        </div>
      );
    case "dragdrop":
      return <WireframeSketchDragdrop />;
    default:
      return (
        <div className="flex h-full flex-col gap-2">
          <div className="h-3 w-8 self-end rounded bg-current/70" />
          <div className="grid flex-1 grid-cols-3 gap-2">
            {[0, 1, 2, 3, 4, 5].map((id) => (
              <div key={id} className="rounded border bg-current/20" />
            ))}
          </div>
        </div>
      );
  }
}
