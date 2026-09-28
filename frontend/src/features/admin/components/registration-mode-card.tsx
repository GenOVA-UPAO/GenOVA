import { Switch } from "@/core/components/ui/switch";

interface RegistrationModeCardProps {
  tesis: boolean;
  saving: boolean;
  onToggle: () => void;
}

const TESIS_DESC =
  "Activado: las cuentas que se registren reciben el rol «Usuarios prueba», pensado para los participantes del estudio. Sus permisos se ajustan en la lista de roles.";
const OPEN_DESC =
  "Desactivado: las cuentas que se registren reciben el rol «Usuario», con acceso completo. Actívalo durante el estudio de tesis.";

/** Rol que reciben las cuentas nuevas (modo tesis) explicado junto al interruptor. */
export function RegistrationModeCard({
  tesis,
  saving,
  onToggle,
}: Readonly<RegistrationModeCardProps>) {
  return (
    <section
      aria-labelledby="registration-mode-title"
      className="flex items-start justify-between gap-6 rounded-xl border border-border bg-card px-5 py-4"
    >
      <div className="min-w-0 space-y-1">
        <h2 id="registration-mode-title" className="text-base font-semibold">
          Modo tesis
        </h2>
        <p id="registration-mode-desc" className="max-w-prose text-sm text-muted-foreground">
          {tesis ? TESIS_DESC : OPEN_DESC}
        </p>
      </div>
      <Switch
        checked={tesis}
        onCheckedChange={onToggle}
        aria-label="Modo tesis"
        aria-describedby="registration-mode-desc"
        aria-busy={saving || undefined}
        disabled={saving}
        className="mt-0.5 disabled:cursor-wait"
      />
    </section>
  );
}
