interface OvaCardMetaProps {
  ownerName?: string;
  /** Fecha ISO para `<time dateTime>`. */
  dateTime?: unknown;
  /** Texto visible de la fecha, ya formateado. */
  dateText: string;
  /** Prefijo opcional de la fecha ("Eliminado el"). */
  datePrefix?: string;
}

/** Línea de metadatos de una tarjeta o fila de OVA: autor · fecha. */
export function OvaCardMeta({
  ownerName,
  dateTime,
  dateText,
  datePrefix,
}: Readonly<OvaCardMetaProps>) {
  if (!ownerName && !dateText) return null;
  const iso = typeof dateTime === "string" ? dateTime : undefined;

  return (
    <p className="truncate text-xs text-muted-foreground">
      {ownerName && <span className="font-medium text-foreground/80">{ownerName}</span>}
      {ownerName && dateText && <span aria-hidden="true"> · </span>}
      {dateText && (
        <time dateTime={iso}>
          {datePrefix ? `${datePrefix} ${dateText}` : dateText}
        </time>
      )}
    </p>
  );
}
