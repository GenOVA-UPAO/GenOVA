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

/** Búsqueda por título y filtro por estado de la biblioteca de OVAs. */
export function MisOvasFilterBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
}: Readonly<MisOvasFilterBarProps>) {
  return (
    <div role="search" className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <SearchInput
        className="flex-1 sm:max-w-md"
        value={search}
        onValueChange={onSearchChange}
        placeholder="Buscar por título"
        ariaLabel="Buscar por título de la OVA"
      />
      <label htmlFor="mis-ovas-status-filter" className="sr-only">
        Filtrar por estado
      </label>
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger id="mis-ovas-status-filter" className="w-full sm:w-48">
          <SelectValue />
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
