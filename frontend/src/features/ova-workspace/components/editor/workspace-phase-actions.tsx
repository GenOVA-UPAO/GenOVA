import { useTranslation } from "react-i18next";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import { RegenPhaseButton } from "./regen-phase-button";

interface Props {
  editorId: string;
  /** Nombre del recurso, para la confirmación de regenerar. */
  name: string;
  editing: boolean;
  busy: boolean;
  onToggleEditor: () => void;
  onRegenerate: () => void;
  onHistory: () => void;
  onDelete: () => void;
}

/** Pie de un recurso en edición: el código a la izquierda; regenerar, versiones y eliminar a la derecha. */
export function WorkspacePhaseActions({
  editorId,
  name,
  editing,
  busy,
  onToggleEditor,
  onRegenerate,
  onHistory,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <footer className="flex flex-wrap items-center gap-1 border-t border-border bg-muted/30 px-1.5 py-1.5">
      <Button
        variant="ghost"
        size="sm"
        aria-expanded={editing}
        aria-controls={editing ? editorId : undefined}
        onClick={onToggleEditor}
      >
        <Icon name="code" />
        {editing ? t("workspace:ocultar_codigo_html") : t("workspace:editar_codigo_html")}
      </Button>
      <span className="flex flex-wrap items-center gap-1 sm:ml-auto">
        <RegenPhaseButton name={name} busy={busy} onRegenerate={onRegenerate} />
        <Button variant="ghost" size="sm" onClick={onHistory}>
          <Icon name="clock-counter-clockwise" />
          {t("workspace:versiones_del_recurso")} </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:text-destructive"
          onClick={onDelete}
        >
          <Icon name="trash" />
          {t("workspace:eliminar_recurso")} </Button>
      </span>
    </footer>
  );
}
