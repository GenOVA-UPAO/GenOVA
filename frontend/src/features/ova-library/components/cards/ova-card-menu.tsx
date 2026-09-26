import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu";
import { Tooltip } from "@/core/components/ui/tooltip";

interface OvaCardMenuProps {
  title: string;
  isGenerating: boolean;
  isMoving?: boolean;
  isDuplicating?: boolean;
  /** Solo el autor edita el título; el admin ve OVAs ajenos sin esa opción. */
  canEdit?: boolean;
  onEditMetadata: () => void;
  onDuplicate: () => void;
  onMoveToTrash: () => void;
}

const ITEM_CLASS = "gap-2.5 px-2.5 py-2";

/** Menú «Más acciones» de la tarjeta: acciones poco frecuentes y la destructiva al final. */
export function OvaCardMenu({
  title,
  isGenerating,
  isMoving = false,
  isDuplicating = false,
  canEdit = true,
  onEditMetadata,
  onDuplicate,
  onMoveToTrash,
}: Readonly<OvaCardMenuProps>) {
  const busy = isGenerating || isDuplicating;

  return (
    <DropdownMenu modal={false}>
      <Tooltip label="Más acciones" side="top">
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="-my-2 -mr-2 shrink-0 text-foreground/70 max-sm:-my-3 max-sm:size-11"
            aria-label={`Más acciones para ${title}`}
          >
            <Icon name="dots-three-vertical" weight="bold" className="size-5" />
          </Button>
        </DropdownMenuTrigger>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-60">
        {canEdit && (
          <DropdownMenuItem className={ITEM_CLASS} disabled={busy} onSelect={onEditMetadata}>
            <Icon name="pencil-simple" size="text-base" />
            Editar título y descripción
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className={ITEM_CLASS} disabled={busy} onSelect={onDuplicate}>
          <Icon name="copy" size="text-base" />
          {isDuplicating ? "Duplicando..." : "Duplicar"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className={ITEM_CLASS}
          variant="destructive"
          disabled={isGenerating || isMoving || isDuplicating}
          onSelect={onMoveToTrash}
        >
          <Icon name="trash" size="text-base" />
          Mover a la papelera
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
