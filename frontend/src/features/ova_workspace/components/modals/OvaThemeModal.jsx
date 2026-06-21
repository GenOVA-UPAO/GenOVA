import { useState } from 'react'
import { motion } from 'motion/react'
import { X } from '@phosphor-icons/react'
import { OvaThemeSelector } from '@/features/ova_workspace/components/modals/OvaThemeSelector.jsx'

const UPAO_PRIMARY = '#0A3D91'
const UPAO_ACCENT = '#F47A20'
const FREE_PRIMARY = '#6D28D9'
const FREE_ACCENT = '#A78BFA'

function MiniPreview({ color, design }) {
  const primary = color === 'upao' ? UPAO_PRIMARY : FREE_PRIMARY
  const accent = color === 'upao' ? UPAO_ACCENT : FREE_ACCENT
  const hasNav = design === 'upao'
  const tabs = ['Engage', 'Explore', 'Explain', 'Evaluate']

  return (
    <div className="rounded-xl border border-border overflow-hidden shadow-md text-left">
      <div className="px-3 py-2.5" style={{ background: primary }}>
        <p className="text-white font-bold text-[9px]">Fotosíntesis y el Ciclo</p>
        <p className="text-white/60 text-[7px] mt-0.5">Biología · 2° año UPAO</p>
      </div>
      {hasNav && (
        <div className="flex bg-muted/30 border-b border-border shrink-0">
          {tabs.map((t, i) => (
            <div key={t} className="px-2 py-1 text-[7px] font-semibold"
              style={{ color: i === 0 ? accent : '#94a3b8', borderBottom: i === 0 ? `2px solid ${accent}` : '2px solid transparent' }}>
              {t}
            </div>
          ))}
        </div>
      )}
      <div className="p-2.5 bg-background space-y-2">
        <div className="h-2 rounded-full w-3/5 opacity-20" style={{ background: primary }} />
        <div className="h-1.5 rounded-full w-full bg-muted" />
        <div className="h-1.5 rounded-full w-5/6 bg-muted" />
        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
          <div className="h-8 rounded-lg opacity-20" style={{ background: accent }} />
          <div className="h-8 rounded-lg bg-muted/50" />
        </div>
        <div className="h-1.5 rounded-full w-4/6 bg-muted opacity-60" />
      </div>
    </div>
  )
}

export function OvaThemeModal({ theme, onThemeChange, onClose }) {
  const [draft, setDraft] = useState(theme)

  const handleApply = () => { onThemeChange(draft); onClose() }

  const themeTitle = draft.color === 'upao' && draft.design === 'upao'
    ? 'Marca institucional UPAO'
    : draft.color === 'free' && draft.design === 'free'
      ? 'Estilo libre (IA elige)'
      : 'Personalizado'

  return (
    <>
      {/* biome-ignore lint/a11y: backdrop dismiss */}
      <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
        <motion.div
          className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <div>
              <p className="text-sm font-semibold">Tema visual del OVA</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{themeTitle}</p>
            </div>
            <button type="button" onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent transition-colors" aria-label="Cerrar">
              <X size={14} weight="bold" />
            </button>
          </div>

          {/* Body: selector + preview */}
          <div className="flex gap-4 p-5">
            <div className="flex-1 min-w-0">
              <OvaThemeSelector theme={draft} onChange={setDraft} />
            </div>
            <div className="w-40 shrink-0 space-y-2 hidden sm:block">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Vista previa</p>
              <MiniPreview color={draft.color} design={draft.design} />
              <p className="text-[10px] text-muted-foreground/70 text-center leading-snug">
                Colores y estructura aproximados
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-border px-5 py-4">
            <button type="button" onClick={handleApply}
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 cursor-pointer transition-opacity">
              Aplicar tema
            </button>
          </div>
        </motion.div>
      </div>
    </>
  )
}
