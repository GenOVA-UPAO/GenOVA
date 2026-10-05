import { useTranslation } from "react-i18next";
import { CheckIcon } from "@phosphor-icons/react";

import { DropdownMenuItem, DropdownMenuLabel } from "@/core/components/ui/dropdown-menu";

import { EXPORT_FORMATS, type ExportFormatId } from "../lib/formats";

interface ExportFormatItemsProps {
  /** Formato recordado: se marca como el de la acción principal. */
  selected: ExportFormatId;
  onSelect: (format: ExportFormatId) => void;
}

/** Entradas de menú con los formatos de exportación; van dentro de un `DropdownMenuContent`. */
export function ExportFormatItems({ selected, onSelect }: Readonly<ExportFormatItemsProps>) {
  const { t } = useTranslation();
  return (
    <>
      <DropdownMenuLabel>{t("shared:descargar_como")}</DropdownMenuLabel>
      {EXPORT_FORMATS.map((format) => (
        <DropdownMenuItem
          key={format.id}
          className="items-start"
          data-format={format.id}
          onSelect={() => {
            onSelect(format.id);
          }}
        >
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-medium">
              {format.label} <span className="text-xs font-normal text-muted-foreground">.{format.extension}</span>
            </span>
            <span className="text-xs whitespace-normal text-muted-foreground">{format.description}</span>
          </span>
          {format.id === selected && <CheckIcon aria-label={t("shared:formato_habitual")} className="mt-0.5" />}
        </DropdownMenuItem>
      ))}
    </>
  );
}
