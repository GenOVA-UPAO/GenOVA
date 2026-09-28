interface FieldMessageProps {
  id: string;
  error?: string;
  hint?: string;
}

/** Error del campo o, si no hay error, su ayuda. El id coincide con `fieldDescribedBy`. */
export function FieldMessage({ id, error, hint }: Readonly<FieldMessageProps>) {
  if (error !== undefined) {
    return (
      <p id={`${id}-error`} className="text-xs text-destructive">
        {error}
      </p>
    );
  }
  if (hint === undefined) return null;
  return (
    <p id={`${id}-help`} className="text-xs text-muted-foreground">
      {hint}
    </p>
  );
}
