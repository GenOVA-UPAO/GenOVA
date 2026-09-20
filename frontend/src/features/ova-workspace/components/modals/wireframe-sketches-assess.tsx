import type { WireframeKind } from "../../lib/previews/preview-types";
import { WireframeSketchDiploma } from "./wireframe-sketch-diploma";

export function WireframeSketchesAssess({ kind }: Readonly<{ kind: WireframeKind }>) {
  const rows = [0, 1, 2];
  switch (kind) {
    case "quiz":
      return (
        <div className="flex h-full flex-col gap-3">
          <div className="flex justify-between">
            <div className="h-2 w-1/2 bg-current/40" />
            <div className="h-4 w-4 rounded-full border border-current/60" />
          </div>
          {rows.map((id) => (
            <div key={id} className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-current" />
              <div className="h-2 w-3/4 bg-current/20" />
            </div>
          ))}
        </div>
      );
    case "form":
      return (
        <div className="flex h-full flex-col gap-3">
          {rows.map((id) => (
            <div key={id} className="space-y-1">
              <div className="h-1 w-1/3 bg-current/30" />
              <div className="h-5 rounded border bg-current/5" />
            </div>
          ))}
          <div className="h-4 w-14 bg-current" />
        </div>
      );
    case "steps":
      return (
        <div className="flex h-full flex-col justify-center gap-4">
          {rows.map((id) => (
            <div key={id} className="flex gap-2">
              <span className="h-5 w-5 rounded-full bg-current/30 text-center text-xs">{id + 1}</span>
              <div className="mt-2 h-2 w-3/4 bg-current/20" />
            </div>
          ))}
        </div>
      );
    case "accordion":
      return (
        <div className="space-y-2">
          {rows.map((id) => (
            <div key={id} className="rounded border p-2">
              <div className="h-2 w-1/2 bg-current/30" />
              {id === 0 && <div className="mt-3 h-6 border-t bg-current/10" />}
            </div>
          ))}
        </div>
      );
    case "table":
      return (
        <div className="grid h-full grid-cols-3 grid-rows-4 gap-px border bg-current/20">
          {Array.from({ length: 12 }, (_, id) => (
            <div key={id} className={id < 3 ? "bg-current/30" : "bg-card"} />
          ))}
        </div>
      );
    case "diploma":
      return <WireframeSketchDiploma />;
    case "crossword":
      return (
        <div className="grid h-full grid-cols-5 grid-rows-5 gap-px bg-current/30">
          {Array.from({ length: 25 }, (_, id) => (
            <div key={id} className={id % 4 === 0 ? "bg-foreground/80" : "bg-card"} />
          ))}
        </div>
      );
    default:
      return <div className="h-full rounded border-2 border-dashed" />;
  }
}
