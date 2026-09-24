import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu";

/** «Más acciones» de un perfil: renombrar y, separado y en rojo, borrar. */
export function ProfileRowMenu({
  name,
  onRename,
  onDelete,
}: Readonly<{ name: string; onRename: () => void; onDelete: () => void }>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-muted-foreground max-sm:size-11"
          aria-label={`Más acciones para el perfil ${name}`}
        >
          <Icon name="dots-three-vertical" size="text-base" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onRename}>
          <Icon name="pencil-simple" size="text-sm" />
          Renombrar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Icon name="trash" size="text-sm" />
          Borrar perfil
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
