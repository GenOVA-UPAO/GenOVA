function ModelPicker({ label, models, value, onChange }) {
  const groq = models.filter((m) => m.provider === 'groq')
  const openrouter = models.filter((m) => m.provider === 'openrouter')

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-600">{label}</label>
      <select
        value={value ? `${value.provider}::${value.id}` : ''}
        onChange={(e) => {
          const [provider, ...rest] = e.target.value.split('::')
          const id = rest.join('::')
          const found = models.find((m) => m.id === id && m.provider === provider)
          onChange(found || null)
        }}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
      >
        <option value="">— Selecciona modelo —</option>
        {groq.length > 0 && (
          <optgroup label="Groq">
            {groq.map((m) => (
              <option key={m.id} value={`groq::${m.id}`}>
                {m.label}
              </option>
            ))}
          </optgroup>
        )}
        {openrouter.length > 0 && (
          <optgroup label="OpenRouter">
            {openrouter.map((m) => (
              <option key={m.id} value={`openrouter::${m.id}`}>
                {m.label}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      {value && (
        <span className="text-[10px] text-slate-400">
          {value.provider === 'groq' ? '🟢 Groq' : '🔵 OpenRouter'} · {value.id}
        </span>
      )}
    </div>
  )
}

export function ModelSelector({ models, modelA, setModelA, modelB, setModelB }) {
  if (!models.length) return <div className="text-xs text-slate-400">Cargando modelos...</div>
  return (
    <div className="grid grid-cols-2 gap-3">
      <ModelPicker label="Modelo A" models={models} value={modelA} onChange={setModelA} />
      <ModelPicker label="Modelo B (opcional)" models={models} value={modelB} onChange={setModelB} />
    </div>
  )
}
