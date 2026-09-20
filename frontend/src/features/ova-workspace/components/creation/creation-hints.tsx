interface Props {
  missing: number;
  phases: number;
  error?: string;
}

/** Avisos de validación de la tarjeta de creación: caracteres, fases y error. */
export function CreationHints({ missing, phases, error }: Readonly<Props>) {
  return (
    <div className="space-y-2 px-5 pb-3 text-xs text-muted-foreground">
      {missing > 0 && <p>Faltan {missing} caracteres para generar</p>}
      {phases < 2 && <p>Selecciona recursos en al menos 2 fases (falta {2 - phases})</p>}
      {error && (
        <p role="alert" aria-live="polite" className="text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
