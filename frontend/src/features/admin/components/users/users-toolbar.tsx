import { SearchInput } from "@/core/components/search-input";

import type { Role } from "../../lib/types";

interface UsersToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  roles: Role[];
}

export function UsersToolbar({
  search,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  roles,
}: Readonly<UsersToolbarProps>) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <SearchInput
        className="flex-1"
        value={search}
        onValueChange={onSearchChange}
        placeholder="Buscar por nombre o email..."
        ariaLabel="Buscar por nombre o email"
        inputClassName="rounded-2xl border-border/50 bg-card/50 py-2.5 font-medium shadow-sm backdrop-blur-md focus:ring-2 focus:ring-primary/20"
      />
      <select
        value={roleFilter}
        onChange={(event) => {
          onRoleFilterChange(event.target.value);
        }}
        aria-label="Filtrar usuarios por rol"
        className="cursor-pointer rounded-2xl border border-border/50 bg-card/50 px-4 py-2.5 text-sm font-medium shadow-sm backdrop-blur-md transition-colors outline-none hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <option value="all">Todos los roles</option>
        {roles.map((role) => (
          <option key={role.id} value={role.name?.toLowerCase() ?? ""}>
            {role.name?.replaceAll("_", " ") ?? ""}
          </option>
        ))}
      </select>
    </div>
  );
}
