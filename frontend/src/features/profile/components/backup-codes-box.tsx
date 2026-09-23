interface BackupCodesBoxProps {
  codes?: string[];
}

export function BackupCodesBox({ codes }: Readonly<BackupCodesBoxProps>) {
  if (codes === undefined || codes.length === 0) return null;

  return (
    <div className="space-y-2 rounded-lg border border-accent-brand/40 p-3">
      <p className="text-sm font-medium">Códigos de respaldo</p>
      <p className="text-xs text-muted-foreground">
        Guárdalos ahora en un lugar seguro: no se volverán a mostrar. Cada uno sirve una vez si
        pierdes el acceso a tu app.
      </p>
      <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {codes.map((code) => (
          <li key={code}>
            <code className="block rounded bg-muted px-1.5 py-1 text-center font-mono text-xs">
              {code}
            </code>
          </li>
        ))}
      </ul>
    </div>
  );
}
