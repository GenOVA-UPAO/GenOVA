import { Link } from "react-router";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import { AUTH_LINK_CLASS, BACK_TO_LOGIN } from "../lib/auth-copy";
import { AuthStatusCard } from "./auth-status-card";

interface VerifyEmailResultProps {
  status: "success" | "error";
  message: string;
  onDashboard: () => void;
}

export function VerifyEmailResult({ status, message, onDashboard }: Readonly<VerifyEmailResultProps>) {
  if (status === "success") {
    return (
      <AuthStatusCard>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Icon name="check-circle" size="text-2xl" className="text-primary" />
        </div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">¡Correo verificado!</h1>
        <p className="mt-2 text-sm text-muted-foreground">Tu cuenta ya está activa.</p>
        <Button type="button" className="mt-5 w-full" onClick={onDashboard}>
          Ir al dashboard
        </Button>
      </AuthStatusCard>
    );
  }

  return (
    <AuthStatusCard>
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <Icon name="warning-circle" size="text-2xl" className="text-destructive" />
      </div>
      <h1 className="font-display text-2xl font-semibold tracking-tight">No se pudo verificar</h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <p className="mt-5 text-sm text-muted-foreground">
        <Link to="/login" className={AUTH_LINK_CLASS}>
          {BACK_TO_LOGIN}
        </Link>{" "}
        para solicitar un nuevo enlace.
      </p>
    </AuthStatusCard>
  );
}
