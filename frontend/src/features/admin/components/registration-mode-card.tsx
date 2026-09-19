import { cn } from "@/core/lib/cn";

interface RegistrationModeCardProps {
  tesis: boolean;
  saving: boolean;
  onToggle: () => void;
}

const TESIS_DESC = 'Nuevos registros reciben el rol "Usuarios Prueba" automáticamente.';
const OPEN_DESC = 'Nuevos registros reciben el rol "usuario" (acceso completo).';

export function RegistrationModeCard({
  tesis,
  saving,
  onToggle,
}: Readonly<RegistrationModeCardProps>) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background p-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Modo tesis</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{tesis ? TESIS_DESC : OPEN_DESC}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={tesis}
        aria-label="Modo tesis"
        disabled={saving}
        onClick={onToggle}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
          tesis ? "cursor-pointer bg-primary" : "bg-input",
          saving ? "cursor-wait opacity-60" : "cursor-pointer",
        )}
      >
        <span
          className={cn(
            "block size-5 rounded-full bg-white shadow-lg transition-transform duration-200",
            tesis ? "translate-x-5" : "translate-x-0",
          )}
        />
      </button>
    </div>
  );
}
