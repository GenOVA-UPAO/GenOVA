import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/core/components/ui/button";

import type { useGeneratePhaseResource } from "../../hooks/use-phase-resources";
import type { Resource } from "../../lib/ova-types";

export function PhaseConceptForm({
  phase,
  resource,
  generation,
}: Readonly<{ phase: string; resource?: Resource; generation: ReturnType<typeof useGeneratePhaseResource> }>) {
  const { t } = useTranslation();
  const [concept, setConcept] = useState("");
  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5">
      <h2 className="font-semibold">{t("workspace:2_define_el_concepto")}</h2>
      <label htmlFor="phase-concept" className="block text-sm font-medium">
        {t("workspace:concepto")} </label>
      <input
        id="phase-concept"
        className="-mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-base focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:text-sm"
        value={concept}
        disabled={generation.isPending}
        onChange={(event) => {
          setConcept(event.target.value);
          generation.reset();
        }}
        placeholder={t("workspace:ej_tablespaces_bloqueos_backup_con_rman")}
      />
      <Button
        disabled={!resource || !concept.trim() || generation.isPending}
        onClick={() => {
          generation.mutate({ phase, resourceId: resource?.id, concept });
        }}
      >
        {t("workspace:generar_recurso")} </Button>
      {!resource && <p className="text-xs text-muted-foreground">{t("workspace:elige_primero_un_tipo_de_recurso_en_el_paso_1")}</p>}
      {generation.isPending && <p role="status" className="text-sm text-muted-foreground">{t("workspace:resourceGeneratingHint")}</p>}
      {generation.error && <p role="alert" className="text-sm text-destructive">{generation.error.message}</p>}
    </section>
  );
}
