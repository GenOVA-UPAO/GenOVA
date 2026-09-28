export function WireframeSketchDashboard() {
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="grid flex-1 grid-cols-4 gap-1">
        {Array.from({ length: 12 }, (_, id) => (
          <div key={id} className="bg-current/15" />
        ))}
      </div>
      <div className="flex h-1/2 items-end gap-2">
        {[45, 70, 55, 90, 40].map((height) => (
          <div key={height} className="flex-1 bg-current/60" style={{ height: `${String(height)}%` }} />
        ))}
      </div>
    </div>
  );
}
