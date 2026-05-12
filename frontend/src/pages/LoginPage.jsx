import { Link } from 'react-router'

export function LoginPage() {
  return (
    <section className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Iniciar sesión</h1>
        <p className="mt-2 text-sm text-slate-600">Accede para continuar al curso de ML.</p>

        <form className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Correo
            <input
              type="email"
              placeholder="estudiante@genova.ai"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Contraseña
            <input
              type="password"
              placeholder="••••••••"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <Link
            to="/dashboard"
            className="inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Entrar
          </Link>
        </form>
      </div>
    </section>
  )
}
