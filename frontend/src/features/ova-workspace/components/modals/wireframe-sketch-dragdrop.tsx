export function WireframeSketchDragdrop() {
  const rows = [0, 1, 2];
  return (
    <div className="flex h-full gap-3">
      <div className="flex w-2/5 flex-col justify-center gap-3">
        {rows.map((id) => (
          <div key={id} className="h-6 rounded border bg-current/20" />
        ))}
      </div>
      <div className="grid flex-1 grid-rows-2 gap-3">
        <div className="rounded border-2 border-dashed border-current/50" />
        <div className="rounded border-2 border-dashed border-current/30" />
      </div>
    </div>
  );
}
