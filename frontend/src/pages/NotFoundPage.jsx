import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <section className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Página no encontrada</h1>
        <p className="mt-2 text-sm text-slate-600">
          La ruta solicitada no existe en la navegación actual.
        </p>
        <Link
          to="/login"
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Volver a login
        </Link>
      </div>
    </section>
  )
}
