export function WireframeSketchDiploma() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-3 rounded border-2 border-current/50">
      <div className="absolute inset-1 border border-current/25" />
      <div className="h-3 w-1/2 bg-current/70" />
      <div className="h-2 w-2/3 bg-current/20" />
      <div className="h-8 w-8 rounded-full border-2 border-current bg-current/20" />
    </div>
  );
}
