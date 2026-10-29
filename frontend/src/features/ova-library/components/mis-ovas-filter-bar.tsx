import { useTranslation } from "react-i18next";

import { SearchInput } from "@/core/components/search-input";
import { Button } from "@/core/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";

import { STATUS_OPTIONS, statusLabel } from "../pages/mis-ovas-page.helpers";

interface MisOvasFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (status: string) => void;
  /** Solo el administrador: alternar entre sus OVAs y los de todos los usuarios. */
  scope?: "mine" | "all";
  onScopeChange?: (scope: "mine" | "all") => void;
}

/** Búsqueda por título y filtro por estado de la biblioteca de OVAs. */
export function MisOvasFilterBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  scope,
  onScopeChange,
}: Readonly<MisOvasFilterBarProps>) {
  const { t } = useTranslation();
  return (
    <div role="search" className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <SearchInput
        className="flex-1 sm:max-w-md"
        value={search}
        onValueChange={onSearchChange}
        placeholder={t("ova-library:buscar_por_titulo")}
        ariaLabel={t("ova-library:buscar_por_titulo_de_la_ova")}
      />
      {onScopeChange && (
        <div role="group" aria-label={t("ova-library:alcance_de_la_biblioteca")} className="flex gap-1">
          {(["mine", "all"] as const).map((value) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={scope === value ? "default" : "outline"}
              aria-pressed={scope === value}
              onClick={() => { onScopeChange(value); }}
            >
              {value === "mine" ? t("ova-library:mis_ovas") : t("ova-library:todos_los_usuarios")}
            </Button>
          ))}
        </div>
      )}
      <label htmlFor="mis-ovas-status-filter" className="sr-only">
        {t("ova-library:filtrar_por_estado")}{" "}
      </label>
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger id="mis-ovas-status-filter" className="w-full sm:w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {statusLabel(opt.value, t)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
