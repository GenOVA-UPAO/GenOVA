import { useNavigate } from "react-router";

import { Button } from "@/core/components/ui/button";

interface OvaGeneratingActionProps {
  ovaId: string;
  isInterrupted?: boolean;
  onResume?: (id: string) => void;
}

/** Botón de acción para OVAs en estado 'generando' (reanudar o continuar). */
export function OvaGeneratingAction({
  ovaId,
  isInterrupted = false,
  onResume,
}: Readonly<OvaGeneratingActionProps>) {
  const navigate = useNavigate();

  const handleContinue = () => {
    onResume?.(ovaId);
    void navigate(`/workspace/${ovaId}`);
  };

  return (
    <div className="mb-1.5 flex gap-2">
      {isInterrupted ? (
        <Button
          variant="outline"
          size="sm"
          className="flex-1 border-primary/30 text-primary hover:bg-primary/5"
          onClick={handleContinue}
        >
          Continuar
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="flex-1 border-primary/30 text-primary hover:bg-primary/5"
          onClick={() => void navigate(`/workspace/${ovaId}`)}
        >
          Reanudar / Ver progreso
        </Button>
      )}
    </div>
  );
}
