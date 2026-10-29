import { useTranslation } from "react-i18next";

import { EmptyState } from "@/core/components/empty-state";
import { Button } from "@/core/components/ui/button";

interface UsersEmptyProps {
  isFiltering: boolean;
  onClearFilters: () => void;
}

/** Vacío de usuarios: sin registros o sin coincidencias para el criterio. */
export function UsersEmpty({ isFiltering, onClearFilters }: Readonly<UsersEmptyProps>) {
  const { t } = useTranslation("admin");

  if (isFiltering) {
    return (
      <EmptyState
        icon="magnifying-glass-minus"
        title={t("users.empty.filterTitle")}
        description={t("users.empty.filterDesc")}
        action={
          <Button variant="outline" onClick={onClearFilters}>
            {t("users.empty.clearFilters")}
          </Button>
        }
      />
    );
  }

  return (
    <EmptyState
      icon="users-three"
      title={t("users.empty.emptyTitle")}
      description={t("users.empty.emptyDesc")}
    />
  );
}
