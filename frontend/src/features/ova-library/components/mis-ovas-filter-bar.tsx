import { SearchInput } from "@/core/components/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";

import { STATUS_OPTIONS } from "../pages/mis-ovas-page.helpers";

interface MisOvasFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (status: string) => void;
}

/** Barra de filtros de búsqueda y estado para la biblioteca de OVAs. */
export function MisOvasFilterBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
}: Readonly<MisOvasFilterBarProps>) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-card/60 p-4 backdrop-blur-sm sm:flex-row">
      <SearchInput
        className="flex-1"
        value={search}
        onValueChange={onSearchChange}
        placeholder="Buscar por título de la OVA..."
        ariaLabel="Buscar por título de la OVA"
        inputClassName="border-muted bg-background/50 h-10 shadow-inner focus-visible:ring-primary/30"
      />

      <label htmlFor="mis-ovas-status-filter" className="sr-only">
        Filtrar por estado
      </label>
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger
          id="mis-ovas-status-filter"
          className="h-10 w-full border-muted bg-background/50 font-medium sm:w-48"
        >
          <SelectValue placeholder="Todos" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
