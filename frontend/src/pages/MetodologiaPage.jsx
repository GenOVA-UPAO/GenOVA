import { Link } from 'react-router'

const FASES = [
  {
    id: 'engage',
    label: 'Engage',
    emoji: '🎯',
    desc: 'Capta la atención y activa conocimientos previos con ganchos creativos.',
    disponible: true,
    to: '/metodologia/engage',
    recursos: 10,
  },
  {
    id: 'explore',
    label: 'Explore',
    emoji: '🔍',
    desc: 'Exploración activa del concepto mediante simulaciones y experimentos guiados.',
    disponible: true,
    to: '/metodologia/explore',
    recursos: 10,
  },
  {
    id: 'explain',
    label: 'Explain',
    emoji: '📖',
    desc: 'Explicación formal del contenido con mapas conceptuales y tutoriales.',
    disponible: false,
  },
  {
    id: 'elaborate',
    label: 'Elaborate',
    emoji: '🔧',
    desc: 'Aplicación y profundización del concepto en contextos reales.',
    disponible: false,
  },
  {
    id: 'evaluate',
    label: 'Evaluate',
    emoji: '📊',
    desc: 'Evaluación formativa y sumativa del aprendizaje logrado.',
    disponible: false,
  },
]

export function MetodologiaPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Metodología 5E</h1>
        <p className="text-slate-600 text-sm">
          Selecciona una fase para generar recursos educativos con IA real.
          Cada fase tiene tipos de recursos diseñados pedagógicamente.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FASES.map((fase, i) => (
          <div
            key={fase.id}
            className={`rounded-xl border p-5 transition-all ${
              fase.disponible
                ? 'border-indigo-200 bg-white shadow-sm hover:shadow-md'
                : 'border-slate-200 bg-slate-50 opacity-60'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 text-xl">
                {fase.emoji}
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Fase {i + 1}
                </span>
                <h2 className="font-semibold text-slate-900 leading-tight">{fase.label}</h2>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-4">{fase.desc}</p>

            {fase.disponible ? (
              <Link
                to={fase.to}
                className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Explorar {fase.recursos} recursos →
              </Link>
            ) : (
              <span className="text-xs text-slate-400 font-medium">Próximamente</span>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
