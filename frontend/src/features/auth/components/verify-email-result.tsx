import { Link } from "react-router";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import { BACK_TO_LOGIN } from "../lib/auth-copy";

const GENERIC_VERIFY_ERROR = "No se pudo verificar el correo.";
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
        <Button type="button" size="lg" className="mt-6 w-full" onClick={onDashboard}>
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
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        No pudimos verificar tu correo
      </h1>
      <p className="mt-2 text-sm text-pretty text-muted-foreground">
        {message === GENERIC_VERIFY_ERROR ? "El enlace no es válido o ya caducó." : message}
      </p>
      <p className="mt-2 text-sm text-pretty text-muted-foreground">
        Inicia sesión con tu correo y contraseña: te ofreceremos enviarte un enlace nuevo.
      </p>
      <Button asChild size="lg" className="mt-6 w-full">
        <Link to="/login">{BACK_TO_LOGIN}</Link>
      </Button>
    </AuthStatusCard>
  );
}
