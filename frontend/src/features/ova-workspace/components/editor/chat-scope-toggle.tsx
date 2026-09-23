import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

function scopeLabel(selecting: boolean, count: number): string {
  if (!selecting || count === 0) return "Aplicar a: todo el OVA";
  return `Aplicar a: ${String(count)} recurso${count !== 1 ? "s" : ""}`;
}

interface Props {
  selecting: boolean;
  count: number;
  onToggle: () => void;
}

/** Alcance de la instrucción: abre o cierra el selector de recursos. */
export function ChatScopeToggle({ selecting, count, onToggle }: Readonly<Props>) {
  return (
    <Button
      variant="ghost"
      size="xs"
      className="text-muted-foreground"
      aria-expanded={selecting}
      aria-controls="chat-resource-select"
      onClick={onToggle}
    >
      {scopeLabel(selecting, count)}
      <Icon name={selecting ? "caret-up" : "caret-down"} />
    </Button>
  );
}
