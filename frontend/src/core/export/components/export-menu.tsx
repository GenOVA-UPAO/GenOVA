import type { ReactNode } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu";

import type { ExportFormatId } from "../lib/formats";
import { ExportFormatItems } from "./export-format-items";

interface ExportMenuProps {
  /** Elemento que abre el menú (un botón). */
  children: ReactNode;
  /** Formato habitual, marcado en la lista. */
  selected: ExportFormatId;
  onSelect: (format: ExportFormatId) => void;
}

/** Menú con todos los formatos de exportación. */
export function ExportMenu({ children, selected, onSelect }: Readonly<ExportMenuProps>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <ExportFormatItems selected={selected} onSelect={onSelect} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
