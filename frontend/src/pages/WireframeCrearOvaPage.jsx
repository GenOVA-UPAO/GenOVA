import { useState } from 'react'
import { useNavigate } from 'react-router'
import { WireframeBanner } from './WireframeUtils.jsx'

const PHASES_5E = [
  { key: 'engage', label: 'Engage', cls: 'text-red-500', resources: ['Video introductorio', 'Pregunta detonadora', 'Actividad motivacional'] },
  { key: 'explore', label: 'Explore', cls: 'text-amber-500', resources: ['Actividad de exploración', 'Lectura guiada', 'Mapa conceptual'] },
  { key: 'explain', label: 'Explain', cls: 'text-blue-500', resources: ['Explicación conceptual', 'Infografía', 'Video explicativo'] },
  { key: 'elaborate', label: 'Elaborate', cls: 'text-purple-500', resources: ['Caso de aplicación', 'Ejercicio práctico'] },
  { key: 'evaluate', label: 'Evaluate', cls: 'text-emerald-500', resources: ['Cuestionario', 'Rúbrica de evaluación'] },
]
const THEMES = [
  { key: 'uu', label: 'UPAO Clásico', desc: 'Paleta + plantilla UPAO', color: 'bg-primary' },
  { key: 'ul', label: 'UPAO Creativo', desc: 'Paleta UPAO, diseño libre', color: 'bg-primary/60' },
  { key: 'lu', label: 'Color libre', desc: 'Color IA, plantilla UPAO', color: 'bg-accent-brand' },
  { key: 'll', label: 'Totalmente libre', desc: 'Color y diseño IA', color: 'bg-accent-brand/60' },
]
const MOCK_FILES = ['curriculum_biologia_upao.pdf', 'notas_clase_fotosintesis.docx']

const IcoSettings = 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4'
const IcoPaper = 'M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13'
const IcoPalette = 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01'
const IcoBolt = 'M13 10V3L4 14h7v7l9-11h-7z'

const SvgBtn = ({ d, active, onClick, title }) => (
  <button type="button" onClick={onClick} title={title}
    className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors cursor-pointer ${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}>
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={d} /></svg>
  </button>
)

export function WireframeCrearOvaPage() {
  const [panel, setPanel] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [theme, setTheme] = useState('uu')
  const [selected, setSelected] = useState({ engage: ['Video introductorio'], explore: [], explain: ['Explicación conceptual'], elaborate: [], evaluate: ['Cuestionario'] })
  const navigate = useNavigate()

  const toggle = (phase, res) => setSelected((p) => ({ ...p, [phase]: p[phase].includes(res) ? p[phase].filter((r) => r !== res) : [...p[phase], res] }))
  const totalRes = Object.values(selected).flat().length
  const openPanel = (key) => setPanel(panel === key ? null : key)

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <WireframeBanner />
      {/* Top bar */}
      <header className="border-b border-border bg-card">
        <div className="flex h-14 items-center px-6 gap-4">
          <button type="button" onClick={() => navigate('/wireframe3')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Mis OVAs
          </button>
          <div className="flex-1" />
          <span className="font-display text-lg font-semibold">Gen<span className="text-primary">OVA</span><span className="ml-1.5 text-[10px] font-sans font-semibold uppercase tracking-[0.18em] text-accent-brand">ML</span></span>
        </div>
      </header>

      {/* Centered card */}
      <div className="flex flex-1 items-start justify-center p-4 pt-12 bg-muted/20">
        <div className="w-full max-w-2xl space-y-4">
          <div className="text-center">
            <h1 className="font-display text-2xl font-semibold">Crear nuevo OVA</h1>
            <p className="text-sm text-muted-foreground mt-1">Describe el contenido y configura los recursos a generar</p>
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5}
              placeholder="Describe el tema, objetivos de aprendizaje y nivel educativo del OVA que quieres crear..."
              className="w-full resize-none bg-transparent px-5 pt-5 pb-3 text-sm placeholder:text-muted-foreground outline-none" />

            {/* File chips */}
            <div className="flex flex-wrap gap-2 px-5 pb-3">
              {MOCK_FILES.map((f) => (
                <span key={f} className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-medium border border-border">
                  <svg className="h-3.5 w-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={IcoPaper} /></svg>
                  {f}
                </span>
              ))}
            </div>

            {/* Resource summary */}
            {totalRes > 0 && (
              <p className="px-5 pb-3 text-xs text-muted-foreground">
                <span className="font-semibold text-primary">{totalRes} recursos</span>
                {' — '}
                {Object.entries(selected).filter(([, v]) => v.length).map(([k, v]) => `${k} (${v.length})`).join(' · ')}
              </p>
            )}

            {/* Theme badge */}
            <div className="px-5 pb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-medium border border-border">
                <div className={`h-2.5 w-2.5 rounded-full ${THEMES.find((t) => t.key === theme)?.color}`} />
                {THEMES.find((t) => t.key === theme)?.label}
              </span>
            </div>

            {/* Action bar */}
            <div className="flex items-center gap-2 border-t border-border px-4 py-3">
              <SvgBtn d={IcoSettings} active={panel === 'config'} onClick={() => openPanel('config')} title="Configurar fases 5E" />
              <SvgBtn d={IcoPaper} active={panel === 'files'} onClick={() => openPanel('files')} title="Subir archivos" />
              <SvgBtn d={IcoPalette} active={panel === 'theme'} onClick={() => openPanel('theme')} title="Tema del OVA" />
              <div className="flex-1" />
              <button type="button" onClick={() => navigate('/wireframe5')}
                className="flex items-center gap-2 rounded-xl bg-accent-brand px-6 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity cursor-pointer shadow-md">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={IcoBolt} /></svg>
                Generar OVA
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Modal con backdrop blur */}
      {panel && (
        <>
          {/* biome-ignore lint/a11y: backdrop dismiss */}
          <div className="fixed inset-0 z-40 bg-foreground/25 backdrop-blur-sm" onClick={() => setPanel(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
              {/* Modal header */}
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <p className="text-sm font-semibold">
                  {panel === 'config' && 'Configurar recursos 5E'}
                  {panel === 'files' && 'Subir archivos de referencia'}
                  {panel === 'theme' && 'Tema visual del OVA'}
                </p>
                <button type="button" onClick={() => setPanel(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent cursor-pointer transition-colors" aria-label="Cerrar">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Config 5E */}
              {panel === 'config' && (
                <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                  <p className="text-xs text-muted-foreground">Selecciona los recursos a generar por fase (máx. 4 por fase)</p>
                  {PHASES_5E.map((ph) => (
                    <div key={ph.key}>
                      <p className={`text-sm font-bold mb-2 ${ph.cls}`}>{ph.label}</p>
                      <div className="flex flex-wrap gap-2">
                        {ph.resources.map((res) => {
                          const on = selected[ph.key]?.includes(res)
                          return (
                            <button key={res} type="button" onClick={() => toggle(ph.key, res)}
                              className={`rounded-full px-3 py-1 text-xs font-medium border cursor-pointer transition-colors ${on ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent'}`}>
                              {res}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-border">
                    <button type="button" onClick={() => setPanel(null)} className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 cursor-pointer transition-opacity">
                      Confirmar selección
                    </button>
                  </div>
                </div>
              )}

              {/* Files */}
              {panel === 'files' && (
                <div className="p-5 space-y-4">
                  <div className="rounded-xl border-2 border-dashed border-border p-10 text-center hover:bg-accent/40 transition-colors cursor-pointer">
                    <svg className="h-12 w-12 mx-auto text-muted-foreground mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    <p className="text-sm font-semibold">Arrastra archivos aquí</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, PPTX, MP3, imágenes</p>
                    <p className="text-xs text-muted-foreground">Alimentan el RAG del OVA generado</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {MOCK_FILES.map((f) => (
                      <span key={f} className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-medium border border-border">
                        <svg className="h-3.5 w-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={IcoPaper} /></svg>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Theme */}
              {panel === 'theme' && (
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {THEMES.map((t) => (
                      <button key={t.key} type="button" onClick={() => setTheme(t.key)}
                        className={`flex items-center gap-3 rounded-xl border p-4 text-left cursor-pointer transition-all ${theme === t.key ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-border hover:bg-accent'}`}>
                        <div className={`h-9 w-9 shrink-0 rounded-xl shadow-sm ${t.color}`} />
                        <div><p className="text-sm font-semibold">{t.label}</p><p className="text-xs text-muted-foreground">{t.desc}</p></div>
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={() => setPanel(null)} className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 cursor-pointer transition-opacity">
                    Aplicar tema
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
