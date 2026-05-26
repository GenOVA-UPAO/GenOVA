import { useState } from 'react'
import { HtmlPreview } from '../engage/HtmlPreview.jsx'

function buildTabs(engage, explore) {
  const tabs = []
  engage.forEach((r, i) => {
    tabs.push({ key: `engage-${i}`, phase: 'engage', globalIndex: tabs.length + 1, result: r })
  })
  explore.forEach((r, i) => {
    tabs.push({ key: `explore-${i}`, phase: 'explore', globalIndex: tabs.length + 1, result: r })
  })
  return tabs
}

function TabsBar({ tabs, active, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2 -mb-px">
      {tabs.map((t) => {
        const isActive = active === t.key
        const tone =
          t.phase === 'engage'
            ? isActive ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            : isActive ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onSelect(t.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${tone}`}
          >
            Recurso {t.globalIndex} · {t.result.tipo}
          </button>
        )
      })}
    </div>
  )
}

export function ResultsPanel({ result, isExporting, onExport }) {
  const tabs = buildTabs(result.engageResults, result.exploreResults)
  const [active, setActive] = useState(tabs[0]?.key ?? null)
  const current = tabs.find((t) => t.key === active) ?? tabs[0]

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-4">
        <TabsBar tabs={tabs} active={current?.key} onSelect={setActive} />
        {current && <HtmlPreview result={current.result} />}
      </div>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-emerald-900">OVA guardado correctamente</h2>
          <p className="text-sm text-emerald-700 mt-0.5">
            {tabs.length} recurso{tabs.length === 1 ? '' : 's'} empaquetado{tabs.length === 1 ? '' : 's'} en SCORM 1.2.
          </p>
        </div>
        <button
          type="button"
          onClick={onExport}
          disabled={isExporting}
          className="w-full sm:w-auto shrink-0 px-5 py-2.5 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
        >
          {isExporting ? 'Exportando…' : 'Exportar a SCORM'}
        </button>
      </div>
    </div>
  )
}
