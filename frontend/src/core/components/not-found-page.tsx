import { Link } from "react-router";

import { Button } from "@/core/components/ui/button";

export function NotFoundPage() {
  return (
    <main className="flex h-dvh flex-col items-center justify-center overflow-y-auto px-5 text-center">
      <p className="mb-10 font-display text-xl font-semibold tracking-tight">
        Gen<span className="text-primary">OVA</span>
      </p>
      <h1 className="font-display text-7xl font-semibold tracking-tight text-primary tabular-nums">
        404
      </h1>
      <h2 className="mt-3 text-xl font-semibold tracking-tight">Esta página no existe</h2>
      <p className="mt-2 max-w-sm text-sm text-pretty text-muted-foreground">
        El enlace puede estar mal escrito o la página ya no está disponible.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link to="/dashboard">Volver al inicio</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/mis-ovas">Ver mis OVAs</Link>
        </Button>
      </div>
    </main>
  );
}
