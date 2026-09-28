export function WireframeGraph() {
  return (
    <div className="relative h-full">
      <svg className="absolute h-full w-full" stroke="currentColor" opacity=".4" aria-hidden="true">
        <line x1="50%" y1="22%" x2="18%" y2="68%" />
        <line x1="50%" y1="22%" x2="82%" y2="68%" />
        <line x1="18%" y1="68%" x2="50%" y2="78%" />
        <line x1="82%" y1="68%" x2="50%" y2="78%" />
      </svg>
      {[
        [50, 22],
        [18, 68],
        [82, 68],
        [50, 78],
      ].map(([x, y]) => (
        <div
          key={`${String(x)}:${String(y)}`}
          className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-current"
          style={{ left: `${String(x)}%`, top: `${String(y)}%` }}
        />
      ))}
    </div>
  );
}
