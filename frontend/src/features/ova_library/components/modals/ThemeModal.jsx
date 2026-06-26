import { useState } from 'react'
import { X } from '@phosphor-icons/react'
import { apiFetch } from '@/core/lib/http/client'
import { useModalDismiss } from '@/core/hooks/useModalDismiss'

const COLOR_MODES = [
  { key: 'ai', label: 'IA elige', desc: 'La IA selecciona colores según el contenido del OVA' },
  { key: 'upao', label: 'Paleta UPAO', desc: 'Azul institucional #0A3D91 + naranja #F47A20' },
  { key: 'custom', label: 'Personalizado', desc: 'Escoge tu propia combinación de colores' },
]

const DESIGN_MODES = [
  { key: 'ai', label: 'IA elige', desc: 'La IA decide layout, tipografía y estructura' },
  { key: 'upao', label: 'Plantilla UPAO', desc: 'Estructura académica con navegación 5E en tabs' },
  { key: 'custom', label: 'Mis plantillas', desc: 'Usa una plantilla guardada o crea una nueva' },
]

const PALETTES = [
  { name: 'UPAO', p: '#0A3D91', a: '#F47A20' },
  { name: 'Oceano', p: '#164E63', a: '#38BDF8' },
  { name: 'Bosque', p: '#14532D', a: '#86EFAC' },
  { name: 'Fuego', p: '#7F1D1D', a: '#FCA5A5' },
  { name: 'Lavanda', p: '#4C1D95', a: '#C4B5FD' },
  { name: 'Cobre', p: '#78350F', a: '#FCD34D' },
  { name: 'Pizarra', p: '#1E293B', a: '#94A3B8' },
  { name: 'Rosa', p: '#831843', a: '#F9A8D4' },
]

function RadioOption({ label, desc, checked, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex items-start gap-2.5 w-full rounded-xl border p-2.5 text-left cursor-pointer transition ${checked ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'}`}>
      <div className={`mt-0.5 h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center ${checked ? 'border-primary' : 'border-muted-foreground/40'}`}>
        {checked && <div className="h-2 w-2 rounded-full bg-primary" />}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{desc}</p>
      </div>
    </button>
  )
}

function MiniPreview({ colorMode, designMode, palette }) {
  const primary = colorMode === 'upao' ? '#0A3D91' : colorMode === 'custom' ? (palette?.p ?? '#0A3D91') : '#6D28D9'
  const accent = colorMode === 'upao' ? '#F47A20' : colorMode === 'custom' ? (palette?.a ?? '#38BDF8') : '#A78BFA'
  const isTabbed = designMode !== 'ai'

  return (
    <div className="rounded-xl border border-border overflow-hidden shadow-md">
      <div style={{ background: primary }} className="px-3 py-2.5">
        <div className="text-white font-bold text-[9px]">Fotosíntesis y el Ciclo</div>
        <div className="text-white/60 text-[7px] mt-0.5">Biología — 2° año · UPAO 2026</div>
      </div>
      {isTabbed && (
        <div className="flex bg-muted/30 border-b border-border">
          {['Engage', 'Explore', 'Explain', 'Evaluate'].map((t, i) => (
            <div key={t} className="px-2 py-1.5 text-[7px] font-semibold shrink-0"
              style={{ color: i === 0 ? accent : '#94a3b8', borderBottom: i === 0 ? `2px solid ${accent}` : '2px solid transparent' }}>
              {t}
            </div>
          ))}
        </div>
      )}
      <div className="p-2.5 space-y-2 bg-background">
        <div className="h-2 rounded-full w-3/5 opacity-25" style={{ background: primary }} />
        <div className="h-1.5 rounded-full w-full bg-muted" />
        <div className="h-1.5 rounded-full w-5/6 bg-muted" />
        <div className="h-1.5 rounded-full w-4/6 bg-muted" />
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <div className="h-8 rounded-lg opacity-20" style={{ background: accent }} />
          <div className="h-8 rounded-lg bg-muted/50" />
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 flex-1 rounded-full" style={{ background: accent, opacity: 0.4 }} />
          <div className="h-2 w-8 rounded-full bg-muted" />
        </div>
      </div>
      <div style={{ background: primary, opacity: 0.06 }} className="h-1" />
    </div>
  )
}

export function ThemeModal({ initialTheme, onClose, onSaved }) {
  const [theme, setTheme] = useState(initialTheme || { colorMode: 'upao', designMode: 'upao', palette: null })
  const [saving, setSaving] = useState(false)
  useModalDismiss(onClose)
  const [saveError, setSaveError] = useState('')

  const { colorMode, designMode, palette } = theme
  const set = (key, val) => setTheme((p) => ({ ...p, [key]: val }))

  const handleSave = async () => {
    setSaving(true)
    setSaveError('')
    try {
      const res = await apiFetch('/api/users/me/theme', {
        method: 'PATCH',
        body: JSON.stringify(theme)
      })
      if (res.ok) {
        onSaved?.(theme)
        onClose()
      } else {
        const data = await res.json().catch(() => ({}))
        setSaveError(data?.detail || data?.message || 'No se pudo guardar el tema.')
      }
    } catch {
      setSaveError('No se pudo conectar con el servidor.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: backdrop */}
      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: backdrop */}
      <div
        className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-display font-semibold">Configuración de Diseño y Tema</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent cursor-pointer">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[72vh] overflow-y-auto">
          <div className="flex gap-4 p-5">
            <div className="flex-1 space-y-5 min-w-0">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Paleta de colores</p>
                {COLOR_MODES.map((m) => <RadioOption key={m.key} label={m.label} desc={m.desc} checked={colorMode === m.key} onClick={() => set('colorMode', m.key)} />)}
                {colorMode === 'custom' && (
                  <div className="flex flex-wrap gap-1.5 pt-1 pl-1">
                    {PALETTES.map((pal) => (
                      <button key={pal.name} type="button" onClick={() => set('palette', pal)} title={pal.name}
                        className={`flex gap-px rounded-lg p-0.5 border-2 cursor-pointer transition ${palette?.name === pal.name ? 'border-primary scale-105' : 'border-transparent hover:border-border'}`}>
                        <div className="h-5 w-5 rounded-l" style={{ background: pal.p }} />
                        <div className="h-5 w-5 rounded-r" style={{ background: pal.a }} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Diseño / Plantilla</p>
                {DESIGN_MODES.map((m) => <RadioOption key={m.key} label={m.label} desc={m.desc} checked={designMode === m.key} onClick={() => set('designMode', m.key)} />)}
              </div>
            </div>

            <div className="w-44 shrink-0 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Previsualización</p>
              <MiniPreview colorMode={colorMode} designMode={designMode} palette={palette} />
              <p className="text-[10px] text-muted-foreground text-center leading-snug">Estructura y colores aproximados</p>
            </div>
          </div>

          <div className="border-t border-border px-5 py-4 space-y-2">
            {saveError ? (
              <p className="text-xs text-destructive text-center">{saveError}</p>
            ) : null}
            <button type="button" onClick={handleSave} disabled={saving} className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 cursor-pointer transition-opacity disabled:opacity-50">
              {saving ? 'Guardando...' : 'Aplicar tema'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
