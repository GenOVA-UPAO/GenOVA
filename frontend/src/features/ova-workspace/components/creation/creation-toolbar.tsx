import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

export type CreationModal = "resources" | "files" | "theme" | undefined;
export function CreationToolbar({
  ready,
  onOpen,
  onGenerate,
}: Readonly<{ ready: boolean; onOpen: (modal: CreationModal) => void; onGenerate: () => void }>) {
  return (
    <div id="tour-crear-ova-config" className="flex flex-wrap items-center gap-1 border-t bg-muted/20 p-3">
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
      <span id="tour-crear-ova-generar" className="ml-auto inline-flex">
        <Button disabled={!ready} onClick={onGenerate}>
          Generar OVA
        </Button>
      </span>
    </div>
  );
}
