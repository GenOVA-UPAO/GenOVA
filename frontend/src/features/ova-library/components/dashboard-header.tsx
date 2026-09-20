import { Link } from "react-router";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

interface DashboardHeaderProps {
  firstName: string;
}

/** Cabecera del dashboard con saludo institucional y botón de creación. */
export function DashboardHeader({ firstName }: Readonly<DashboardHeaderProps>) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-accent-brand">
          GenOVA · UPAO
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">
          Bienvenido, {firstName}
        </h1>
        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Icon name="clock" size="text-base" />
          Tu espacio para crear y gestionar OVAs con IA.
        </p>
      </div>
      <Button asChild className="gap-1.5 shadow-sm">
        <Link to="/crear">
          <Icon name="plus" size="text-base" />
          Crear OVA
        </Link>
      </Button>
    </div>
  );
}
