const ENGAGE_RESOURCES = [
  { id: 1, tipo: 'Cómic Interactivo', emoji: '🎭', interactividad: 'Alta' },
  { id: 2, tipo: 'Video Opening', emoji: '🎬', interactividad: 'Baja' },
  { id: 3, tipo: 'Micro-Podcast', emoji: '🎙️', interactividad: 'Baja' },
  { id: 4, tipo: 'Juego de Gamificación', emoji: '🎮', interactividad: 'Alta' },
  { id: 5, tipo: 'Dilema Ético', emoji: '⚖️', interactividad: 'Media' },
  { id: 6, tipo: 'Noticia de Impacto', emoji: '📰', interactividad: 'Baja' },
  { id: 7, tipo: 'Juego de Roles', emoji: '🎯', interactividad: 'Media' },
  { id: 8, tipo: 'Timeline Interactivo', emoji: '📅', interactividad: 'Media' },
  { id: 9, tipo: 'Escape Room Virtual', emoji: '🔐', interactividad: 'Alta' },
  { id: 10, tipo: 'Simulador Intuitivo', emoji: '🎛️', interactividad: 'Alta' },
]

const EXPLORE_RESOURCES = [
  { id: 1, tipo: 'Simulador Virtual Lab', emoji: '🧪', interactividad: 'Alta' },
  { id: 2, tipo: 'Agente Socrático', emoji: '🤔', interactividad: 'Alta' },
  { id: 3, tipo: 'Juego Drag & Drop', emoji: '🎮', interactividad: 'Media' },
  { id: 4, tipo: 'Video con Pausa Activa', emoji: '🎬', interactividad: 'Media' },
  { id: 5, tipo: 'Lectura Interactiva', emoji: '📖', interactividad: 'Media' },
  { id: 6, tipo: 'Simulador de Slider', emoji: '🎛️', interactividad: 'Alta' },
  { id: 7, tipo: 'Experimento Guiado', emoji: '🔬', interactividad: 'Media' },
  { id: 8, tipo: 'Juego de Roles', emoji: '🎭', interactividad: 'Media' },
  { id: 9, tipo: 'Mapa Mental', emoji: '🗺️', interactividad: 'Alta' },
  { id: 10, tipo: 'Lab de Hipótesis', emoji: '💡', interactividad: 'Alta' },
]

const INTERACTIVIDAD_COLOR = {
  Alta: 'bg-green-100 text-green-700',
  Media: 'bg-yellow-100 text-yellow-700',
  Baja: 'bg-slate-100 text-slate-500',
}

function ResourceGrid({ resources, phase, selectedPhase, selectedType, onSelect }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {resources.map((r) => {
        const active = selectedPhase === phase && selectedType === r.id
        return (
          <button
            key={r.id}
            onClick={() => onSelect(phase, r.id)}
            className={`rounded-lg border p-3 text-left transition-all ${
              active
                ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <span className="text-xl">{r.emoji}</span>
            <p className="mt-1 text-xs font-medium text-slate-800 leading-tight">{r.tipo}</p>
            <span
              className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${INTERACTIVIDAD_COLOR[r.interactividad]}`}
            >
              {r.interactividad}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function PhaseResourceSelector({ selectedPhase, selectedType, onSelect }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          🎯 Fase ENGAGE
        </h3>
        <ResourceGrid
          resources={ENGAGE_RESOURCES}
          phase="engage"
          selectedPhase={selectedPhase}
          selectedType={selectedType}
          onSelect={onSelect}
        />
      </div>
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          🔍 Fase EXPLORE
        </h3>
        <ResourceGrid
          resources={EXPLORE_RESOURCES}
          phase="explore"
          selectedPhase={selectedPhase}
          selectedType={selectedType}
          onSelect={onSelect}
        />
      </div>
    </div>
  )
}
