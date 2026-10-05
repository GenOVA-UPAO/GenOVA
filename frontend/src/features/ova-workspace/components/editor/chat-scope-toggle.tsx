import { useTranslation } from "react-i18next";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

interface Props {
  selecting: boolean;
  count: number;
  onToggle: () => void;
}

/** Alcance de la instrucción: abre o cierra el selector de recursos. */
export function ChatScopeToggle({ selecting, count, onToggle }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Button
      variant="ghost"
      size="xs"
      className="text-muted-foreground"
      aria-expanded={selecting}
      aria-controls="chat-resource-select"
      onClick={onToggle}
    >
      {selecting && count > 0 ? t("workspace:chatScope", { count }) : t("workspace:aplicar_a_todo_el_ova")}
      <Icon name={selecting ? "caret-up" : "caret-down"} />
    </Button>
  );
}
