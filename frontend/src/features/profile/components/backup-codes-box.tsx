interface BackupCodesBoxProps {
  codes?: string[];
}

export function BackupCodesBox({ codes }: Readonly<BackupCodesBoxProps>) {
  if (codes === undefined || codes.length === 0) return null;

  return (
    <div className="space-y-1.5 rounded-lg border border-amber-500/30 bg-amber-50/10 p-3">
      <p className="text-[10px] font-semibold tracking-wide text-amber-600 uppercase">
        Códigos de respaldo — guárdalos ahora, no se mostrarán de nuevo
      </p>
      <div className="grid grid-cols-4 gap-1">
        {codes.map((code) => (
          <code
            key={code}
            className="rounded bg-muted/60 px-1.5 py-0.5 text-center font-mono text-xs"
          >
            {code}
          </code>
        ))}
      </div>
    </div>
  );
}
