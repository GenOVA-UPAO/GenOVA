import { useTranslation } from "react-i18next";

import { EmptyState } from "@/core/components/empty-state";
import { QueryErrorState } from "@/core/components/query-error-state";
import { Button } from "@/core/components/ui/button";

import type { Role } from "../lib/types";
import { RoleList } from "./role-list";
import { RolesSkeleton } from "./roles-skeleton";

interface RolesPanelProps {
  isLoading: boolean;
  error: string;
  roles: Role[];
  onRetry: () => void;
  onCreate: () => void;
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
}

export function RolesPanel({
  isLoading,
  error,
  roles,
  onRetry,
  onCreate,
  onEdit,
  onDelete,
}: Readonly<RolesPanelProps>) {
  const { t } = useTranslation("admin");

  if (isLoading) {
    return <RolesSkeleton />;
  }

  if (error !== "") {
    return <QueryErrorState title={t("roles.loadError")} onRetry={onRetry} />;
  }

  if (roles.length === 0) {
    return (
      <EmptyState
        icon="shield-check"
        title={t("roles.emptyTitle")}
        description={t("roles.emptyDescription")}
        action={<Button onClick={onCreate}>{t("roles.newRole")}</Button>}
      />
    );
  }

  return <RoleList roles={roles} onEdit={onEdit} onDelete={onDelete} />;
}
