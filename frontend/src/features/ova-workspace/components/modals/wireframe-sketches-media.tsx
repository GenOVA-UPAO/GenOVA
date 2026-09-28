import type { WireframeKind } from "../../lib/previews/preview-types";
import { WireframeSketchComic } from "./wireframe-sketch-comic";

export function WireframeSketchesMedia({ kind }: Readonly<{ kind: WireframeKind }>) {
  switch (kind) {
    case "comic":
      return <WireframeSketchComic />;
    case "storyboard":
      return (
        <div className="flex h-full flex-col gap-2">
          {[0, 1, 2].map((id) => (
            <div key={id} className="flex flex-1 gap-2">
              <div className="w-10 shrink-0 rounded border bg-current/20" />
              <div className="my-2 h-2 flex-1 bg-current/30" />
            </div>
          ))}
          <div className="h-4 rounded border border-dashed border-current/50" />
        </div>
      );
    case "audio":
      return (
        <div className="flex h-full items-center gap-3">
          <span className="rounded-full bg-current/20 p-3">▶</span>
          <div className="flex h-full items-center gap-1">
            {[25, 45, 65, 85, 70, 50, 35, 20].map((height) => (
              <div key={height} className="w-1.5 rounded-full bg-current" style={{ height: `${String(height)}%` }} />
            ))}
          </div>
        </div>
      );
    case "read":
      return (
        <div className="flex h-full gap-3">
          <div className="w-1/3 rounded bg-current/40" />
          <div className="flex flex-1 flex-col justify-center gap-2">
            {[95, 75, 90, 60, 80].map((width) => (
              <div key={width} className="h-2 rounded bg-current/30" style={{ width: `${String(width)}%` }} />
            ))}
          </div>
        </div>
      );
    case "demo":
      return (
        <div className="flex h-full flex-col gap-2">
          <div className="flex flex-1 items-center justify-center rounded border">
            <span className="h-12 w-12 rounded-full border-2 border-current/60 bg-current/20" />
          </div>
          <div className="text-center">▶ ▪ ▪</div>
        </div>
      );
    case "infographic":
      return (
        <div className="flex h-full flex-col gap-2">
          <div className="h-2 w-3/5 rounded bg-current" />
          <div className="grid flex-1 grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((id) => (
              <div key={id} className="rounded border bg-current/10 p-2">
                <span className="block h-3 w-3 bg-current/60" />
                <div className="mt-3 h-1 bg-current/30" />
              </div>
            ))}
          </div>
        </div>
      );
    case "timeline":
      return (
        <div className="flex h-full items-center">
          <div className="relative flex w-full justify-between border-t-2 border-current/30">
            {[0, 1, 2, 3].map((id) => (
              <div key={id} className="-mt-2 h-4 w-4 rounded-full border-2 border-background bg-current" />
            ))}
          </div>
        </div>
      );
    default:
      return null;
  }
}
