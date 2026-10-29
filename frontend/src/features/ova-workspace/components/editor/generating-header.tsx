import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

/** Cabecera mínima mientras el OVA se genera: volver y título, sin acciones aún. */
export function GeneratingHeader() {
  const { t } = useTranslation();
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-3 sm:px-4">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-1 text-muted-foreground max-sm:size-11 max-sm:px-0"
      >
        <Link to="/mis-ovas" aria-label={t("workspace:volver_a_mis_ovas")}>
          <Icon name="arrow-left" />
          <span className="hidden sm:inline">{t("workspace:mis_ovas")}</span>
        </Link>
      </Button>
      <span aria-hidden="true" className="h-5 w-px bg-border" />
      <h1 className="truncate font-display text-lg font-semibold">{t("workspace:generando_tu_ova")}</h1>
    </header>
  );
}
