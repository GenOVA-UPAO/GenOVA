import { Button } from "@/core/components/ui/button";

interface UserOverrideHeaderProps {
  isOverride: boolean;
  disabled: boolean;
  onUsePlatform: () => void;
}

/** Título de «Tu modelo»: dice si la tarea usa tu elección o sigue a la plataforma. */
export function UserOverrideHeader({
  isOverride,
  disabled,
  onUsePlatform,
}: Readonly<UserOverrideHeaderProps>) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div>
        <p className="text-sm font-medium">Tu modelo</p>
        <p className="text-xs text-muted-foreground">
          {isOverride
            ? "Se usa en lugar del de la plataforma y se paga con tu clave."
            : "Ahora usas el de la plataforma. Elige otro para usarlo con tu clave."}
        </p>
      </div>
      {isOverride ? (
        <Button
          variant="ghost"
          size="xs"
          className="text-muted-foreground"
          disabled={disabled}
          onClick={onUsePlatform}
        >
          Usar el de la plataforma
        </Button>
      ) : null}
    </div>
  );
}
