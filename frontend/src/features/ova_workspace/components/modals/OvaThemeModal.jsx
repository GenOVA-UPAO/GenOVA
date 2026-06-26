import { useState } from 'react'
import { m as motion } from 'motion/react'
import { X } from '@phosphor-icons/react'
import { OvaThemeSelector } from '@/features/ova_workspace/components/modals/OvaThemeSelector.jsx'
import { useModalDismiss } from '@/core/hooks/useModalDismiss'

const UPAO_PRIMARY = '#0A3D91'
const UPAO_ACCENT = '#F47A20'
const FREE_PRIMARY = '#6D28D9'
const FREE_ACCENT = '#A78BFA'

function MiniPreview({ color }) {
  const primary = color === 'upao' ? UPAO_PRIMARY : FREE_PRIMARY
  const accent = color === 'upao' ? UPAO_ACCENT : FREE_ACCENT

  return (
    <div className="rounded-xl border border-border overflow-hidden shadow-md text-left">
      <div className="px-3 py-2.5" style={{ background: primary }}>
        <p className="text-white font-bold text-[9px]">Introducción a Machine Learning</p>
      </div>
      <div className="h-10 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${primary}1A 0%, ${accent}26 100%)` }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-5 w-5 rounded-full flex items-center justify-center"
            style={{ background: `${accent}33`, border: `1.5px solid ${accent}66` }}>
            <div style={{
              width: 0, height: 0,
              borderTop: '3px solid transparent',
              borderBottom: '3px solid transparent',
              borderLeft: `5px solid ${accent}`,
              marginLeft: 1,
            }} />
          </div>
        </div>
      </div>
      <div className="p-2.5 bg-background space-y-1.5">
        <p className="text-[7px] font-bold leading-none" style={{ color: primary }}>¿Qué es una red neuronal?</p>
        <div className="h-1 rounded-full w-full bg-muted/70" />
        <div className="h-1 rounded-full w-5/6 bg-muted/70" />
        <div className="h-1 rounded-full w-4/6 bg-muted/70" />
        <div className="rounded-md py-1 mt-1 text-center" style={{ background: accent }}>
          <p className="text-[6px] font-bold text-white">Continuar →</p>
        </div>
      </div>
    </div>
  )
}

export function OvaThemeModal({ theme, onThemeChange, onClose }) {
  const [draft, setDraft] = useState(theme)
  useModalDismiss(onClose)

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
