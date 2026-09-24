import { Icon } from "@/core/components/icon";

/**
 * Aviso del modo de solo lectura. Un OVA es obra de quien lo creó (profesor o
 * alumno): los demás, como el admin, pueden revisarlo pero no modificarlo.
 */
export function WorkspaceReadOnlyNotice() {
  return (
    <div
      role="note"
      className="flex shrink-0 items-start gap-2.5 border-b border-border bg-muted/50 px-3 py-2.5 text-sm sm:items-center sm:px-4"
    >
      <Icon name="lock" className="mt-0.5 shrink-0 text-muted-foreground sm:mt-0" />
      <p className="min-w-0 text-muted-foreground">
        <span className="font-medium text-foreground">Solo lectura.</span> Solo quien creó este OVA
        puede modificarlo. Puedes revisarlo, comparar sus versiones y descargar el SCORM.
      </p>
    </div>
  );
}
