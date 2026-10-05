import i18n from "i18next";
import { useTranslation } from "react-i18next";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

function scopeLabel(selecting: boolean, count: number): string {
  if (!selecting || count === 0) return i18n.t("workspace:aplicar_a_todo_el_ova");
  return i18n.t("workspace:aplicar_a_value_recursovalue", { p0: String(count), p1: count !== 1 ? "s" : "" });
}

interface Props {
  selecting: boolean;
  count: number;
  onToggle: () => void;
}

/** Alcance de la instrucción: abre o cierra el selector de recursos. */
export function ChatScopeToggle({ selecting, count, onToggle }: Readonly<Props>) {
  useTranslation();
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
