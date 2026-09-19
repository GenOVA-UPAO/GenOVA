export function WireframeLab() {
  return (
    <div className="flex h-full items-center gap-4">
      <svg viewBox="0 0 64 80" className="h-full w-1/2" fill="none" aria-hidden="true">
        <path d="M26 4h12v24s16 14 16 28c0 12-10 20-22 20S10 68 10 56c0-14 16-28 16-28z" stroke="currentColor" />
        <path d="M14 52c0 14 8 20 18 20s18-6 18-20c-4-4-12-6-18-6s-14 2-18 6z" fill="currentColor" opacity=".6" />
        <circle cx="24" cy="54" r="2.2" fill="currentColor" />
        <circle cx="36" cy="58" r="1.4" fill="currentColor" />
      </svg>
      <div className="flex-1 space-y-6">
        {[40, 65].map((left) => (
          <div key={left} className="relative h-2 rounded bg-current/20">
            <div
              className="absolute -top-1 h-4 w-4 rounded-full border-2 border-background bg-current"
              style={{ left: `${String(left)}%` }}
            />
          </div>
        ))}
        <div className="h-4 rounded bg-current" />
      </div>
    </div>
  );
}
