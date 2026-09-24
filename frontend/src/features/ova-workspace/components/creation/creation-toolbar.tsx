import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import { cn } from "@/core/lib/cn";

import { selectionSummary } from "../../lib/creation-guidance";
import type { EducationLevelId } from "../../lib/education-levels";
import type { OvaTheme } from "../../lib/types";
import { CreationLevelSelect } from "./creation-level-select";

export type CreationModal = "resources" | "files" | "theme" | undefined;
interface ToolbarProps {
  nivel: EducationLevelId;
  onNivelChange: (nivel: EducationLevelId) => void;
  total: number;
  phases: number;
  fileCount: number;
  theme: OvaTheme;
  onOpen: (modal: CreationModal) => void;
}

function themeValue(theme: OvaTheme): string {
  if (theme.color === "upao" && theme.design === "upao") return "UPAO";
  if (theme.color === "free" && theme.design === "free") return "Libre";
  return "Mixto";
}

/** 36 px en escritorio; en móvil, 44 px y repartidos a lo ancho de la fila. */
const TOOL_CLASS = "max-sm:h-11 max-sm:flex-1 sm:px-2.5";

function countBadge(value: number) {
  if (value === 0) return null;
  return (
    <span
      aria-hidden="true"
      className="rounded-full bg-primary/10 px-1.5 text-xs font-semibold tabular-nums text-primary"
    >
      {value}
    </span>
  );
}

/** Configuración opcional del OVA: recursos 5E, archivos, tema y nivel. */
export function CreationToolbar({
  nivel,
  onNivelChange,
  total,
  phases,
  fileCount,
  theme,
  onOpen,
}: Readonly<ToolbarProps>) {
  return (
    <div
      id="tour-crear-ova-config"
      className="relative flex flex-wrap items-center gap-2 border-t lg:flex-nowrap border-border px-4 py-3 sm:px-5"
    >
      <span id="crear-resources-summary" className="sr-only">
        {selectionSummary(total, phases)}
      </span>
      <Button
        variant="outline"
        className={cn(TOOL_CLASS, "max-sm:basis-full")}
        aria-label="Configurar recursos 5E"
        aria-describedby="crear-resources-summary"
        onClick={() => {
          onOpen("resources");
        }}
      >
        <Icon name="squares-four" />
        Recursos
        {countBadge(total)}
      </Button>
      <Button
        variant="outline"
        className={TOOL_CLASS}
        aria-label="Archivos de referencia"
        onClick={() => {
          onOpen("files");
        }}
      >
        <Icon name="paperclip" />
        Archivos
        {countBadge(fileCount)}
      </Button>
      <Button
        variant="outline"
        className={TOOL_CLASS}
        aria-label="Tema visual"
        aria-describedby="crear-theme-value"
        onClick={() => {
          onOpen("theme");
        }}
      >
        <Icon name="palette" />
        Tema
        <span id="crear-theme-value" className="font-normal text-muted-foreground">
          {themeValue(theme)}
        </span>
      </Button>
      <CreationLevelSelect value={nivel} onChange={onNivelChange} />
    </div>
  );
}
