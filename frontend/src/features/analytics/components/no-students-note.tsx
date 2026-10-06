import { useTranslation } from "react-i18next";

import { Icon } from "@/core/components/icon";

/** Docente sin alumnos vinculados: explica por qué las métricas salen a cero. */
export function NoStudentsNote() {
  const { t } = useTranslation("analytics");
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card px-5 py-4">
      <Icon name="users-three" size="text-xl" className="mt-0.5 shrink-0 text-muted-foreground" />
      <div className="space-y-1">
        <h2 className="text-base font-semibold">{t("noStudents.title")}</h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          {t("noStudents.description")}
        </p>
      </div>
    </div>
  );
}
