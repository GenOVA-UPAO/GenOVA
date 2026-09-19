import { Link } from "react-router";

import { Button } from "@/core/components/ui/button";

export function NotFoundPage() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4 text-center">
      <h1 className="mb-4 text-6xl font-extrabold tracking-tight text-primary">404</h1>
      <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight">
        Página no encontrada
      </h2>
      <p className="mb-8 text-muted-foreground">
        Lo sentimos, no pudimos encontrar la página que estás buscando.
      </p>
      <Button asChild size="lg">
        <Link to="/">Volver al inicio</Link>
      </Button>
    </main>
  );
}
