import { useLocation, useNavigate } from 'react-router'

// biome-ignore lint/style/useComponentExportOnlyModules: wireframe shared data
export const WF_PAGES = [
  ['/wireframe1', 'Nav'],
  ['/wireframe2', 'Dashboard'],
  ['/wireframe3', 'Mis OVAs'],
  ['/wireframe4', 'Crear OVA'],
  ['/wireframe5', 'Workspace (gen)'],
  ['/wireframe6', 'Workspace (edit)'],
]

export function WireframeBanner({ extra }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 bg-accent-brand px-4 py-1.5 text-[11px] font-semibold text-white">
      <span className="font-bold tracking-widest uppercase opacity-80">WF</span>
      <span className="opacity-30">|</span>
      {WF_PAGES.map(([path, label]) => (
        <button key={path} type="button" onClick={() => navigate(path)}
          className={`rounded px-2 py-0.5 transition-colors cursor-pointer ${pathname === path ? 'bg-white/25' : 'hover:bg-white/15'}`}>
          {label}
        </button>
      ))}
      {extra && <div className="ml-auto">{extra}</div>}
    </div>
  )
}

export const Ico = ({ d, className = 'h-5 w-5' }) => (
  <svg className={`${className} shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={d} />
  </svg>
)

// biome-ignore lint/style/useComponentExportOnlyModules: wireframe shared data
export const STATUS_DOT = { active: 'bg-accent-brand animate-pulse', done: 'bg-emerald-500', idle: 'bg-muted-foreground/30' }

// biome-ignore lint/style/useComponentExportOnlyModules: wireframe shared data
export const STATUS_BADGE = {
  listo: { label: 'Listo', cls: 'bg-emerald-100 text-emerald-700' },
  generando: { label: 'Generando', cls: 'bg-blue-100 text-blue-700' },
  borrador: { label: 'Borrador', cls: 'bg-muted text-muted-foreground' },
  error: { label: 'Error', cls: 'bg-red-100 text-red-700' },
}
