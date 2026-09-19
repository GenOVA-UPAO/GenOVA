import { Button } from "@/core/components/ui/button";

interface Props {
  isStalled: boolean;
  showResume: boolean;
  resumableCount: number;
  total: number;
  resuming: boolean;
  showCancel: boolean;
  onResume: () => void;
  onCancel: () => void;
}

export function ProgressBanners({
  isStalled,
  showResume,
  resumableCount,
  total,
  resuming,
  showCancel,
  onResume,
  onCancel,
}: Readonly<Props>) {
  if (!isStalled && !showResume) return null;
  return (
    <>
      {isStalled && (
        <div className="rounded-lg border border-accent-brand/30 bg-accent-brand/10 p-3 text-xs">
          <p className="font-medium text-foreground">
            La generación lleva un rato sin actividad — puedes seguir esperando, reanudar o cancelar.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onResume}
            >
              Reanudar
            </Button>
            {showCancel && (
              <Button
                variant="outline"
                size="sm"
                className="text-muted-foreground"
                onClick={onCancel}
              >
                Cancelar
              </Button>
            )}
          </div>
        </div>
      )}
      {showResume && (
        <div className="rounded-lg border border-accent-brand/30 bg-accent-brand/10 p-3 text-xs">
          <p className="font-medium text-foreground">
            La generación se interrumpió a mitad: quedan {resumableCount} de {total} por generar. Lo
            ya hecho se conserva — al reanudar solo se regenera lo que falta.
          </p>
          <div className="mt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={resuming}
              onClick={onResume}
            >
              {resuming ? "Reanudando…" : "Reanudar generación"}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
