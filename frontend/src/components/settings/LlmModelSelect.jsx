/**
 * Selector de modelo (provider+model) desde el catálogo. Valor codificado como
 * "provider::model_id"; emite onChange(provider, model_id).
 */
export function LlmModelSelect({ models, provider, modelId, onChange, disabled, ariaLabel }) {
  const value = provider && modelId ? `${provider}::${modelId}` : ''
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      disabled={disabled}
      onChange={(e) => {
        const [p, m] = e.target.value.split('::')
        onChange(p || '', m || '')
      }}
      className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
    >
      <option value="">— elegir modelo —</option>
      {models.map((m) => (
        <option key={`${m.provider}::${m.model_id}`} value={`${m.provider}::${m.model_id}`}>
          {`${m.label || m.model_id} · ${m.provider}`}
        </option>
      ))}
    </select>
  )
}
