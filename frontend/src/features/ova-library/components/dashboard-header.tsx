import i18n from "i18next";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

interface DashboardHeaderProps {
  firstName: string;
}

/** Saludo del dashboard. En escritorio «Crear OVA» ya está en la barra superior. */
export function DashboardHeader({ firstName }: Readonly<DashboardHeaderProps>) {
  useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {i18n.t("ova-library:bienvenido")} {firstName}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-[0.9375rem]">
          {i18n.t("ova-library:crea_revisa_y_exporta_tus_objetos_virtuales_de_aprendizaje")}{" "}
        </p>
      </div>
      <Button asChild size="lg" className="w-full sm:hidden">
        <Link to="/crear">
          <Icon name="plus" size="text-base" />
          {i18n.t("ova-library:crear_ova")}{" "}
        </Link>
      </Button>
    </div>
  );
}
