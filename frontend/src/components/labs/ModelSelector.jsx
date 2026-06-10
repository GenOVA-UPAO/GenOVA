import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectSeparator } from '@/components/ui/select'

const EMPTY_VALUE = '__none__'

function ModelPicker({ label, models, value, onChange }) {
  const groq = models.filter((m) => m.provider === 'groq')
  const openrouter = models.filter((m) => m.provider === 'openrouter')

  const selectedKey = value ? `${value.provider}::${value.id}` : EMPTY_VALUE

  function handleChange(key) {
    if (key === EMPTY_VALUE) { onChange(null); return }
    const [provider, ...rest] = key.split('::')
    const id = rest.join('::')
    const found = models.find((m) => m.id === id && m.provider === provider)
    onChange(found || null)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      <Select value={selectedKey} onValueChange={handleChange}>
        <SelectTrigger>
          <SelectValue placeholder="— Selecciona modelo —" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={EMPTY_VALUE}>— Selecciona modelo —</SelectItem>
          {groq.length > 0 ? (
            <SelectGroup>
              <SelectLabel>Groq</SelectLabel>
              {groq.map((m) => (
                <SelectItem key={m.id} value={`groq::${m.id}`}>{m.label}</SelectItem>
              ))}
            </SelectGroup>
          ) : null}
          {groq.length > 0 && openrouter.length > 0 ? <SelectSeparator /> : null}
          {openrouter.length > 0 ? (
            <SelectGroup>
              <SelectLabel>OpenRouter</SelectLabel>
              {openrouter.map((m) => (
                <SelectItem key={m.id} value={`openrouter::${m.id}`}>{m.label}</SelectItem>
              ))}
            </SelectGroup>
          ) : null}
        </SelectContent>
      </Select>
      {value ? (
        <span className="text-[10px] text-muted-foreground">
          {value.provider === 'groq' ? '🟢 Groq' : '🔵 OpenRouter'} · {value.id}
        </span>
      ) : null}
    </div>
  )
}

export function ModelSelector({ models, modelA, setModelA, modelB, setModelB }) {
  if (!models.length) return <div className="text-xs text-muted-foreground">Cargando modelos...</div>
  return (
    <div className="grid grid-cols-2 gap-3">
      <ModelPicker label="Modelo A" models={models} value={modelA} onChange={setModelA} />
      <ModelPicker label="Modelo B (opcional)" models={models} value={modelB} onChange={setModelB} />
    </div>
  )
}
