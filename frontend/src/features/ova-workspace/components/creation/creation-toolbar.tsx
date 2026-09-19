import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";

import { EDUCATION_LEVELS, type EducationLevelId } from "../../lib/education-levels";

export type CreationModal = "resources" | "files" | "theme" | undefined;
interface ToolbarProps {
  nivel: EducationLevelId;
  onNivelChange: (nivel: EducationLevelId) => void;
  ready: boolean;
  onOpen: (modal: CreationModal) => void;
  onGenerate: () => void;
}
export function CreationToolbar({
  nivel,
  onNivelChange,
  ready,
  onOpen,
  onGenerate,
}: Readonly<ToolbarProps>) {
  return (
    <div
      id="tour-crear-ova-config"
      className="flex flex-wrap items-center gap-1 border-t bg-muted/20 p-3"
    >
      <Button
        variant="ghost"
        size="sm"
        aria-label="Configurar recursos 5E"
        onClick={() => {
          onOpen("resources");
        }}
      >
        <Icon name="gear" />
        <span className="hidden sm:inline">Recursos</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        aria-label="Archivos de referencia"
        onClick={() => {
          onOpen("files");
        }}
      >
        <Icon name="paperclip" />
        <span className="hidden sm:inline">Archivos</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        aria-label="Tema visual"
        onClick={() => {
          onOpen("theme");
        }}
      >
        <Icon name="palette" />
        <span className="hidden sm:inline">Tema</span>
      </Button>
      <label htmlFor="ova-create-nivel" className="sr-only">
        Nivel educativo
      </label>
      <Select
        value={nivel}
        onValueChange={(value) => {
          onNivelChange(value as EducationLevelId);
        }}
      >
        <SelectTrigger id="ova-create-nivel" size="sm" className="w-auto max-w-full text-xs">
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
      <span id="tour-crear-ova-generar" className="ml-auto inline-flex">
        <Button disabled={!ready} onClick={onGenerate}>
          Generar OVA
        </Button>
      </span>
    </div>
  );
}
