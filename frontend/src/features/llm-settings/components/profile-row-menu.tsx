import { type Ref, useRef } from "react";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu";

interface ProfileRowMenuProps {
  name: string;
  /** El botón del menú: la fila le devuelve el foco al terminar de renombrar. */
  triggerRef?: Ref<HTMLButtonElement>;
  onRename: () => void;
  onDelete: () => void;
}

/** «Más acciones» de un perfil: renombrar y, separado y en rojo, borrar. */
export function ProfileRowMenu({
  name,
  triggerRef,
  onRename,
  onDelete,
}: Readonly<ProfileRowMenuProps>) {
  // Al elegir «Renombrar», el foco va al campo del nombre: el menú no debe
  // devolverlo a su botón al cerrarse.
  const renaming = useRef(false);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          ref={triggerRef}
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-muted-foreground max-sm:size-11"
          aria-label={`Más acciones para el perfil ${name}`}
        >
          <Icon name="dots-three-vertical" size="text-base" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onCloseAutoFocus={(event) => {
          if (!renaming.current) return;
          renaming.current = false;
          event.preventDefault();
        }}
      >
        <DropdownMenuItem
          onSelect={() => {
            renaming.current = true;
            onRename();
          }}
        >
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
