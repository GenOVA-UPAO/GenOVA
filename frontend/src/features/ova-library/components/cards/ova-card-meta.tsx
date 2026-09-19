import { cn } from "@/core/lib/cn";

interface OvaCardMetaProps {
  description?: string;
  ownerName?: string;
  dateText?: string | null;
  dateClassName?: string;
}

/** Metadatos secundarios (descripción, autor y fecha) para la tarjeta de OVA. */
export function OvaCardMeta({
  description,
  ownerName,
  dateText,
  dateClassName,
}: Readonly<OvaCardMetaProps>) {
  return (
    <>
      {description && (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {description}
        </p>
      )}
      {ownerName && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          Por: <span className="font-medium text-foreground">{ownerName}</span>
        </p>
      )}
      {dateText && (
        <p className={cn("mt-1.5 text-xs", dateClassName)}>
          {dateText}
        </p>
      )}
    </>
  );
}
