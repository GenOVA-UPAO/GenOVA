import { useTranslation } from "react-i18next";

import { SearchInput } from "@/core/components/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";

import { formatRoleName } from "../../lib/role-utils";
import { ALL_ROLE_FILTER, type Role } from "../../lib/types";

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
  const { t } = useTranslation("admin");

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <SearchInput
        className="flex-1"
        value={search}
        onValueChange={onSearchChange}
        placeholder={t("users.toolbar.searchPlaceholder")}
        ariaLabel={t("users.toolbar.searchPlaceholder")}
        inputClassName="h-10 max-md:h-11"
      />
      <Select value={roleFilter} onValueChange={onRoleFilterChange}>
        <SelectTrigger
          aria-label={t("users.toolbar.filterRoleLabel")}
          className="h-10 w-full sm:w-52 max-md:h-11"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" align="end">
          <SelectItem value={ALL_ROLE_FILTER}>{t("users.toolbar.allRoles")}</SelectItem>
          {roles.map((role) => (
            <SelectItem key={role.id} value={role.id}>
              {formatRoleName(role.name)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
