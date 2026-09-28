export function WireframeSketchComic() {
  return (
    <div className="flex h-full w-full flex-col gap-2">
      <div className="relative flex-1 rounded border bg-muted/40 p-3">
        <span className="block h-4 w-4 rounded-full bg-current" />
        <div className="mt-8 h-2 w-4/5 rounded bg-current/30" />
        <div className="mt-2 h-2 w-3/5 rounded bg-current/20" />
      </div>
      <div className="flex justify-between">
        <span>‹</span>
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((id) => (
            <span key={id} className="h-1 w-1 rounded-full bg-current" />
          ))}
        </div>
        <span>›</span>
      </div>
    </div>
  );
}
