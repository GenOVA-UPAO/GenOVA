import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";

import { selectionSummary } from "../../lib/creation-guidance";
import { EDUCATION_LEVELS, type EducationLevelId } from "../../lib/education-levels";
import type { OvaTheme } from "../../lib/types";

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

function countBadge(value: number) {
  if (value === 0) return null;
  return (
    <span aria-hidden="true" className="rounded-full bg-primary/10 px-1.5 text-xs font-semibold tabular-nums text-primary">
      {value}
    </span>
  );
}

/** Configuración opcional del OVA: recursos 5E, archivos, tema y nivel. */
export function CreationToolbar({ nivel, onNivelChange, total, phases, fileCount, theme, onOpen }: Readonly<ToolbarProps>) {
  return (
    <div id="tour-crear-ova-config" className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3 sm:px-5">
      <span id="crear-resources-summary" className="sr-only">
        {selectionSummary(total, phases)}
      </span>
      <Button
        variant="outline"
        size="sm"
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
        size="sm"
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
        size="sm"
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
      <div className="flex w-full min-w-0 items-center gap-2 sm:ml-auto sm:w-auto">
        <label htmlFor="ova-create-nivel" className="shrink-0 text-xs font-medium text-muted-foreground">
          Nivel educativo
        </label>
        <Select
          value={nivel}
          onValueChange={(value) => {
            onNivelChange(value as EducationLevelId);
          }}
        >
          <SelectTrigger id="ova-create-nivel" size="sm" className="min-w-0 flex-1 text-xs sm:w-auto sm:flex-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EDUCATION_LEVELS.map((level) => (
              <SelectItem key={level.id} value={level.id}>
                {level.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
