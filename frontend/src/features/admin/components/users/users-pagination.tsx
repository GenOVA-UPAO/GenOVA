import { useTranslation } from "react-i18next";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

interface UsersPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function UsersPagination({
  page,
  totalPages,
  onPageChange,
}: Readonly<UsersPaginationProps>) {
  const { t } = useTranslation("admin");

  if (totalPages <= 1) return null;

  return (
    <nav aria-label={t("users.pagination.ariaLabel")} className="flex items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground tabular-nums">
        {t("users.pagination.page")} {page} {t("users.pagination.of")} {totalPages}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="max-md:h-11"
          disabled={page === 1}
          onClick={() => {
            onPageChange(page - 1);
          }}
        >
          <Icon name="caret-left" size="text-sm" /> {t("users.pagination.previous")}
        </Button>
        <Button
          variant="outline"
          className="max-md:h-11"
          disabled={page === totalPages}
          onClick={() => {
            onPageChange(page + 1);
          }}
        >
          {t("users.pagination.next")} <Icon name="caret-right" size="text-sm" />
        </Button>
      </div>
    </nav>
  );
}
