import { Icon } from "@/core/components/icon";

/** Docente sin alumnos vinculados: explica por qué las métricas salen a cero. */
export function NoStudentsNote() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card px-5 py-4">
      <Icon name="users-three" size="text-xl" className="mt-0.5 shrink-0 text-muted-foreground" />
      <div className="space-y-1">
        <h2 className="text-base font-semibold">Aún no tienes alumnos vinculados</h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          Estas métricas cuentan los OVAs de los alumnos vinculados a tu cuenta. Cuando se
          vinculen, verás aquí su actividad.
        </p>
      </div>
    </div>
  );
}
