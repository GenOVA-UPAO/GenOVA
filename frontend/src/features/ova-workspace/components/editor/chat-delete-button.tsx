import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import { cn } from "@/core/lib/cn";

function messagePreview(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "sin texto";
  return trimmed.length > 48 ? `${trimmed.slice(0, 48)}…` : trimmed;
}

/**
 * Borrar un mensaje del hilo: discreto (aparece al pasar el cursor o al
 * enfocar el mensaje) salvo en pantallas táctiles, donde siempre se ve.
 */
export function ChatDeleteButton({ text, onDelete, className }: Readonly<{ text: string; onDelete: () => void; className?: string }>) {
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      className={cn(
        "shrink-0 text-muted-foreground opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100 pointer-coarse:opacity-100",
        className,
      )}
      aria-label={`Eliminar mensaje: ${messagePreview(text)}`}
      onClick={onDelete}
    >
      <Icon name="trash" className="size-3.5" />
    </Button>
  );
}
