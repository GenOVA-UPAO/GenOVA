import { useState } from 'react'

const PHASE_COLORS = {
  enganche: { tab: 'bg-violet-600 text-white', badge: 'bg-violet-100 text-violet-700 border-violet-200' },
  exploracion: { tab: 'bg-sky-600 text-white', badge: 'bg-sky-100 text-sky-700 border-sky-200' },
  explicacion: { tab: 'bg-emerald-600 text-white', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  elaboracion: { tab: 'bg-amber-600 text-white', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  evaluacion: { tab: 'bg-rose-600 text-white', badge: 'bg-rose-100 text-rose-700 border-rose-200' },
}

const DEFAULT_TAB = 'bg-slate-100 text-slate-600'
const DEFAULT_BADGE = 'bg-slate-100 text-slate-600 border-slate-200'

function phaseColor(phaseId) {
  return PHASE_COLORS[phaseId] ?? { tab: DEFAULT_TAB, badge: DEFAULT_BADGE }
}

function PhaseSection({ section }) {
  if (section.type === 'heading') {
    return (
      <h3 className="mt-5 text-base font-semibold text-slate-900 first:mt-0">{section.content}</h3>
    )
  }

  if (section.type === 'paragraph') {
    return <p className="mt-3 text-sm leading-relaxed text-slate-700">{section.content}</p>
  }

  if (section.type === 'list') {
    const Tag = section.ordered ? 'ol' : 'ul'
    return (
      <Tag
        className={`mt-3 space-y-1.5 pl-5 text-sm text-slate-700 ${
          section.ordered ? 'list-decimal' : 'list-disc'
        }`}
      >
        {(section.items ?? []).map((item, i) => (
          <li key={i} className="leading-relaxed">
            {item}
          </li>
        ))}
      </Tag>
    )
  }

  if (section.type === 'code') {
    return (
      <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
        {section.language ? (
          <div className="border-b border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">
            {section.language}
          </div>
        ) : null}
        <pre className="overflow-x-auto bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
          <code>{section.content}</code>
        </pre>
      </div>
    )
  }

  if (section.type === 'image') {
    return (
      <figure className="mt-3">
        <img
          src={section.src}
          alt={section.alt ?? ''}
          className="max-w-full rounded-lg border border-slate-200"
        />
        {section.alt ? (
          <figcaption className="mt-1 text-center text-xs text-slate-500">{section.alt}</figcaption>
        ) : null}
      </figure>
    )
  }

  return null
}

function PhasePanel({ phase, colors }) {
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colors.badge}`}>
          Fase {phase.order} — {phase.label}
        </span>
        <button
          type="button"
          disabled
          title="Disponible en Sprint 2"
          aria-label={`Editar fase ${phase.label} (disponible en Sprint 2)`}
          className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-400 opacity-60 shadow-sm"
        >
          <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="h-3.5 w-3.5"
          >
            <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.263a1.75 1.75 0 0 0 0-2.474ZM4.75 14a.75.75 0 0 1 0-1.5h6.5a.75.75 0 0 1 0 1.5h-6.5Z" />
          </svg>
          Editar
        </button>
      </div>

      <div className="mt-4">
        {(phase.sections ?? []).map((section, i) => (
          <PhaseSection key={i} section={section} />
        ))}
      </div>
    </div>
  )
}

export function OvaFiveEViewer({ content }) {
  const phases = content?.phases ?? []
  const [activeIndex, setActiveIndex] = useState(0)

  if (!phases.length) return null

  const activePhase = phases[activeIndex]
  const colors = phaseColor(activePhase?.id)

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-lg font-semibold text-slate-900">Vista previa del OVA — Modelo 5E</h2>
        {content?.title ? (
          <p className="mt-0.5 text-sm text-slate-500 line-clamp-1" title={content.title}>
            {content.title}
          </p>
        ) : null}
      </header>

      {/* Tab bar */}
      <nav
        role="tablist"
        aria-label="Fases del modelo 5E"
        className="flex flex-wrap gap-1 border-b border-slate-100 px-5 py-3"
      >
        {phases.map((phase, i) => {
          const isActive = i === activeIndex
          const c = phaseColor(phase.id)
          return (
            <button
              key={phase.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${phase.id}`}
              id={`tab-${phase.id}`}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                isActive ? c.tab : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {phase.label}
            </button>
          )
        })}
      </nav>

      {/* Panel */}
      <div
        id={`panel-${activePhase?.id}`}
        role="tabpanel"
        aria-labelledby={`tab-${activePhase?.id}`}
        className="px-5 py-5"
      >
        {activePhase ? (
          <PhasePanel phase={activePhase} colors={colors} />
        ) : null}
      </div>
    </section>
  )
}
