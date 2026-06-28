import { Label } from '@/core/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/core/components/ui/select'

interface Model {
  id: string
  provider: string
  label?: string
  [key: string]: unknown
}

interface ModelPickerProps {
  label: string
  models: Model[]
  value: Model | null
  onChange: (model: Model | null) => void
}

interface ModelSelectorProps {
  models: Model[]
  modelA: Model | null
  setModelA: (model: Model | null) => void
  modelB: Model | null
  setModelB: (model: Model | null) => void
}

const EMPTY_VALUE = '__none__'

function ModelPicker({ label, models, value, onChange }: ModelPickerProps) {
  const groq = models.filter((m) => m.provider === 'groq')
  const openrouter = models.filter((m) => m.provider === 'openrouter')

  const selectedKey = value ? `${value.provider}::${value.id}` : EMPTY_VALUE

  function handleChange(key: string) {
    if (key === EMPTY_VALUE) {
      onChange(null)
      return
    }
    const [provider, ...rest] = key.split('::')
    const id = rest.join('::')
    const found = models.find((m) => m.id === id && m.provider === provider)
    onChange(found || null)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-semibold text-muted-foreground">
        {label}
      </Label>
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
                <SelectItem key={m.id} value={`groq::${m.id}`}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ) : null}
          {groq.length > 0 && openrouter.length > 0 ? (
            <SelectSeparator />
          ) : null}
          {openrouter.length > 0 ? (
            <SelectGroup>
              <SelectLabel>OpenRouter</SelectLabel>
              {openrouter.map((m) => (
                <SelectItem key={m.id} value={`openrouter::${m.id}`}>
                  {m.label}
                </SelectItem>
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

export function ModelSelector({
  models,
  modelA,
  setModelA,
  modelB,
  setModelB,
}: ModelSelectorProps) {
  if (!models.length)
    return (
      <div className="text-xs text-muted-foreground">Cargando modelos...</div>
    )
  return (
    <div className="grid grid-cols-2 gap-3">
      <ModelPicker
        label="Modelo A"
        models={models}
        value={modelA}
        onChange={setModelA}
      />
      <ModelPicker
        label="Modelo B (opcional)"
        models={models}
        value={modelB}
        onChange={setModelB}
      />
    </div>
  )
}
