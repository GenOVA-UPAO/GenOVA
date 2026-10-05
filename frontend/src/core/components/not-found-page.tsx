import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { Button } from "@/core/components/ui/button";

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <main className="flex h-dvh flex-col items-center justify-center overflow-y-auto px-5 text-center">
      <p className="mb-10 font-display text-xl font-semibold tracking-tight">
        {t("shared:gen")}<span className="text-primary">{t("shared:ova")}</span>
      </p>
      <h1 className="font-display text-7xl font-semibold tracking-tight text-primary tabular-nums">
        404
      </h1>
      <h2 className="mt-3 text-xl font-semibold tracking-tight">{t("shared:esta_pagina_no_existe")}</h2>
      <p className="mt-2 max-w-sm text-sm text-pretty text-muted-foreground">
        {t("shared:el_enlace_puede_estar_mal_escrito_o_la_pagina_909760")} </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link to="/dashboard">{t("shared:volver_al_inicio")}</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/mis-ovas">{t("shared:ver_mis_ovas")}</Link>
        </Button>
      </div>
    </main>
  );
}
