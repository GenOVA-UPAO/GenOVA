import { Link } from "react-router";

import { Button } from "@/core/components/ui/button";

import { ServerAlert } from "./server-alert";

export function ResetTokenMissing() {
  return (
    <div className="mt-8 space-y-5">
      <ServerAlert>Enlace inválido o incompleto</ServerAlert>
      <p className="text-sm text-muted-foreground">
        El enlace de restablecimiento no incluye un token válido. Solicita uno nuevo para continuar.
      </p>
      <Button asChild className="w-full">
        <Link to="/forgot-password">Solicitar nuevo enlace</Link>
      </Button>
    </div>
  );
}
