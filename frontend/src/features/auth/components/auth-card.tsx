import type { ReactNode } from "react";

import { AuthBrandPanel } from "./auth-brand-panel";

interface AuthCardProps {
  title: string;
  children: ReactNode;
  subtitle?: string;
  /** Contexto corto sobre el título (p. ej. «Verificación en 2 pasos»). */
  eyebrow?: string;
}

/**
 * Marco de las pantallas de acceso. `body` no hace scroll (lo gestiona el layout de
 * la app), así que esta vista lleva su propio contenedor con scroll: sin él, el
 * registro quedaba cortado en móviles bajos.
 */
export function AuthCard({ title, children, subtitle, eyebrow }: Readonly<AuthCardProps>) {
  return (
    <main className="grid h-dvh overflow-y-auto bg-background lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <AuthBrandPanel />
      <div className="flex min-h-full items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[400px]">
          <p className="font-display text-xl font-semibold tracking-tight lg:hidden">
            Gen<span className="text-primary">OVA</span>
          </p>
          {eyebrow !== undefined && (
            <p className="mt-8 text-sm font-medium text-primary lg:mt-0">{eyebrow}</p>
          )}
          <h1
            className={`font-display text-3xl font-semibold tracking-tight ${eyebrow === undefined ? "mt-8 lg:mt-0" : "mt-1.5"}`}
          >
            {title}
          </h1>
          {subtitle ? <p className="mt-2 text-sm text-pretty text-muted-foreground">{subtitle}</p> : null}
          {children}
        </div>
      </div>
    </main>
  );
}
