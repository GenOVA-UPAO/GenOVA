import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

interface ScormButtonProps {
  canExport: boolean;
  pending: boolean;
  onDownload: () => void;
}

/** Acción principal del OVA; desactivada con una pista mientras el servidor diría 409. */
export function ScormButton({ canExport, pending, onDownload }: Readonly<ScormButtonProps>) {
  return (
    <Button
      aria-label="Descargar SCORM"
      loading={pending}
      disabled={!canExport}
      title={
        canExport ? undefined : "Termina o elimina los recursos con error para descargar el SCORM."
      }
      className="max-md:h-11 max-md:px-4"
      onClick={onDownload}
    >
      <Icon name="download-simple" />
      <span className="md:hidden">SCORM</span>
      <span className="hidden md:inline">Descargar SCORM</span>
    </Button>
  );
}
