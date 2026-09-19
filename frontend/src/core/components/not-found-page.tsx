import { Link } from "react-router";

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
      <Link
        to="/"
        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
