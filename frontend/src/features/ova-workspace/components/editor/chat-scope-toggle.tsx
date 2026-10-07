import { useTranslation } from "react-i18next";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

interface Props {
  selecting: boolean;
  count: number;
  onToggle: () => void;
  /** Quita la selección y vuelve a «todo el OVA». */
  onClear: () => void;
}

/** Alcance de la instrucción: abre o cierra el selector de recursos. */
export function ChatScopeToggle({ selecting, count, onToggle, onClear }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <>
    <Button
      variant="ghost"
      size="xs"
      className="text-muted-foreground"
      aria-expanded={selecting}
      aria-controls="chat-resource-select"
      onClick={onToggle}
    >
      {count > 0 ? t("workspace:chatScope", { count }) : t("workspace:aplicar_a_todo_el_ova")}
      <Icon name={selecting ? "caret-up" : "caret-down"} />
    </Button>
    {count > 0 && (
      <Button variant="ghost" size="xs" className="text-muted-foreground" onClick={onClear}>
        {t("workspace:quitar_seleccion")}
      </Button>
    )}
    </>
  );
}
