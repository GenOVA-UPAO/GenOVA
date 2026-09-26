import type { ActivityDate } from "../../lib/ova-card-format";

interface OvaCardMetaProps {
  /** Autor del OVA (solo llega para administradores). */
  ownerName?: string;
  /** Fecha relativa ya formateada; la completa sale al pasar el ratón. */
  activity: ActivityDate | null;
}

/** Línea de metadatos de una tarjeta o fila de OVA: autor · fecha. */
export function OvaCardMeta({ ownerName, activity }: Readonly<OvaCardMetaProps>) {
  if (!ownerName && !activity) return null;

  return (
    <p className="text-xs text-pretty break-words text-muted-foreground">
      {ownerName && <span className="font-medium text-foreground/80">{ownerName}</span>}
      {ownerName && activity && <span aria-hidden="true"> · </span>}
      {activity && (
        <time dateTime={activity.iso} title={activity.full} className="whitespace-nowrap">
          {activity.label}
        </time>
      )}
    </p>
  );
}
