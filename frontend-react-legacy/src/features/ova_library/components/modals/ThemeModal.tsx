import { X } from '@phosphor-icons/react'
import { useState } from 'react'
import {
  MiniPreview,
  type Palette,
  RadioOption,
} from '@/features/ova_library/components/modals/ThemeModalControls'
import { useModalDismiss } from '@/core/hooks/useModalDismiss'
import { apiFetch } from '@/core/lib/http/client'

export interface ThemeState {
  colorMode: string
  designMode: string
  palette: Palette | null
}

interface ThemeModalProps {
  initialTheme?: ThemeState | null
  onClose: () => void
  onSaved?: (theme: ThemeState) => void
}

const COLOR_MODES = [
  {
    key: 'ai',
    label: 'IA elige',
    desc: 'La IA selecciona colores según el contenido del OVA',
  },
  {
    key: 'upao',
    label: 'Paleta UPAO',
    desc: 'Azul institucional #0A3D91 + naranja #F47A20',
  },
  {
    key: 'custom',
    label: 'Personalizado',
    desc: 'Escoge tu propia combinación de colores',
  },
]

const DESIGN_MODES = [
  {
    key: 'ai',
    label: 'IA elige',
    desc: 'La IA decide layout, tipografía y estructura',
  },
  {
    key: 'upao',
    label: 'Plantilla UPAO',
    desc: 'Estructura académica con navegación 5E en tabs',
  },
  {
    key: 'custom',
    label: 'Mis plantillas',
    desc: 'Usa una plantilla guardada o crea una nueva',
  },
]

const PALETTES: Palette[] = [
  { name: 'UPAO', p: '#0A3D91', a: '#F47A20' },
  { name: 'Oceano', p: '#164E63', a: '#38BDF8' },
  { name: 'Bosque', p: '#14532D', a: '#86EFAC' },
  { name: 'Fuego', p: '#7F1D1D', a: '#FCA5A5' },
  { name: 'Lavanda', p: '#4C1D95', a: '#C4B5FD' },
  { name: 'Cobre', p: '#78350F', a: '#FCD34D' },
  { name: 'Pizarra', p: '#1E293B', a: '#94A3B8' },
  { name: 'Rosa', p: '#831843', a: '#F9A8D4' },
]



export function ThemeModal({
  initialTheme,
  onClose,
  onSaved,
}: ThemeModalProps) {
  const [theme, setTheme] = useState<ThemeState>(
    initialTheme || { colorMode: 'upao', designMode: 'upao', palette: null },
  )
  const [saving, setSaving] = useState(false)
  useModalDismiss(onClose)
  const [saveError, setSaveError] = useState('')

  const { colorMode, designMode, palette } = theme
  const set = (key: keyof ThemeState, val: string | Palette | null) =>
    setTheme((p) => ({ ...p, [key]: val }))

  const handleSave = async () => {
    setSaving(true)
    setSaveError('')
    try {
      const res = await apiFetch('/api/users/me/theme', {
        method: 'PATCH',
        body: JSON.stringify(theme),
      })
      if (res.ok) {
        onSaved?.(theme)
        onClose()
      } else {
        const data = await res.json().catch(() => ({}))
        setSaveError(
          data?.detail || data?.message || 'No se pudo guardar el tema.',
        )
      }
    } catch {
      setSaveError('No se pudo conectar con el servidor.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* biome-ignore lint/a11y: backdrop dismiss; cierre accesible vía botón X y tecla Escape (useModalDismiss) */}
      <div
        className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-display font-semibold">
            Configuración de Diseño y Tema
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent cursor-pointer"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[72vh] overflow-y-auto">
          <div className="flex gap-4 p-5">
            <div className="flex-1 space-y-5 min-w-0">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Paleta de colores
                </p>
                {COLOR_MODES.map((m) => (
                  <RadioOption
                    key={m.key}
                    label={m.label}
                    desc={m.desc}
                    checked={colorMode === m.key}
                    onClick={() => set('colorMode', m.key)}
                  />
                ))}
                {colorMode === 'custom' && (
                  <div className="flex flex-wrap gap-1.5 pt-1 pl-1">
                    {PALETTES.map((pal) => (
                      <button
                        key={pal.name}
                        type="button"
                        onClick={() => set('palette', pal)}
                        title={pal.name}
                        className={`flex gap-px rounded-lg p-0.5 border-2 cursor-pointer transition ${palette?.name === pal.name ? 'border-primary scale-105' : 'border-transparent hover:border-border'}`}
                      >
                        <div
                          className="h-5 w-5 rounded-l"
                          style={{ background: pal.p }}
                        />
                        <div
                          className="h-5 w-5 rounded-r"
                          style={{ background: pal.a }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Diseño / Plantilla
                </p>
                {DESIGN_MODES.map((m) => (
                  <RadioOption
                    key={m.key}
                    label={m.label}
                    desc={m.desc}
                    checked={designMode === m.key}
                    onClick={() => set('designMode', m.key)}
                  />
                ))}
              </div>
            </div>

            <div className="w-44 shrink-0 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Previsualización
              </p>
              <MiniPreview
                colorMode={colorMode}
                designMode={designMode}
                palette={palette}
              />
              <p className="text-[10px] text-muted-foreground text-center leading-snug">
                Estructura y colores aproximados
              </p>
            </div>
          </div>

          <div className="border-t border-border px-5 py-4 space-y-2">
            {saveError ? (
              <p className="text-xs text-destructive text-center">
                {saveError}
              </p>
            ) : null}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 cursor-pointer transition-opacity disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Aplicar tema'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
