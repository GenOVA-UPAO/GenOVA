import { Link } from 'react-router'
import { Button } from '@/core/components/ui/button'

export function NotFoundPage() {
  return (
    <section className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-foreground">Página no encontrada</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          La ruta solicitada no existe en la navegación actual.
        </p>
        <Button asChild size="lg" className="mt-4">
          <Link to="/login">Volver a login</Link>
        </Button>
      </div>
    </section>
  )
}
