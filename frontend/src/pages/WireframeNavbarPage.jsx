import { useState } from 'react'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { to: '/mis-ovas', label: 'Mis OVAs', d: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4' },
  { to: '/papelera', label: 'Papelera', d: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16', badge: 3 },
]
const ADMIN = [
  { to: '/admin/roles', label: 'Roles', d: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z' },
  { to: '/admin/users', label: 'Usuarios', d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { to: '/admin/platform', label: 'API Keys', d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
  { to: '/admin/labs', label: 'Labs', d: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
]

const Ico = ({ d }) => (
  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={d} />
  </svg>
)
const IcoPlus = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
const IcoBars = () => <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
const IcoX = () => <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>

const linkCls = (on) =>
  `flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${on ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground/75 hover:bg-accent hover:text-foreground'}`

function SectionLabel({ text }) {
  return <p className="px-2 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{text}</p>
}

function NavItem({ item, active, onClick }) {
  const on = active === item.to
  return (
    <button type="button" onClick={() => onClick(item.to)} className={linkCls(on)}>
      <Ico d={item.d} />
      <span className="flex-1 text-left">{item.label}</span>
      {item.badge && !on && <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-white">{item.badge}</span>}
    </button>
  )
}

function UserProfileCard() {
  return (
    <div className="border-t border-sidebar-border p-3">
      <div className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent transition-colors cursor-pointer">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">JR</div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">Jeffry Romero</p>
          <p className="truncate text-xs text-muted-foreground">jeffry@upao.edu.pe</p>
        </div>
      </div>
    </div>
  )
}

function SidebarNav({ active, onClick, isAdmin }) {
  return (
    <>
      <nav className="flex-1 overflow-y-auto px-2 pb-3">
        <SectionLabel text="Principal" />
        {NAV.map((item) => <NavItem key={item.to} item={item} active={active} onClick={onClick} />)}
        {isAdmin && (
          <>
            <SectionLabel text="Administración" />
            {ADMIN.map((item) => <NavItem key={item.to} item={item} active={active} onClick={onClick} />)}
          </>
        )}
      </nav>
      <UserProfileCard />
    </>
  )
}

export function WireframeNavbarPage() {
  const [active, setActive] = useState('/dashboard')
  const [isAdmin, setIsAdmin] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const activeLabel = [...NAV, ...ADMIN].find((n) => n.to === active)?.label ?? 'Página'

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Wireframe banner */}
      <div className="flex items-center justify-center gap-4 bg-accent-brand py-1.5 text-xs font-semibold text-white tracking-wide">
        <span>WIREFRAME — Rediseño Navbar / Sidebar</span>
        <button type="button" onClick={() => setIsAdmin(!isAdmin)} className="rounded border border-white/40 px-2 py-0.5 transition-colors hover:bg-white/20 cursor-pointer">
          {isAdmin ? 'Vista Admin activa' : 'Vista Normal — activar Admin'}
        </button>
      </div>

      {/* Navbar */}
      <header className="z-50 border-b border-border bg-card">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
          <button type="button" onClick={() => setDrawerOpen(true)} className="md:hidden -ml-1 rounded-lg p-2 text-muted-foreground hover:bg-accent cursor-pointer" aria-label="Abrir menú">
            <IcoBars />
          </button>
          <span className="font-display text-xl font-semibold tracking-tight">
            Gen<span className="text-primary">OVA</span>
            <span className="ml-1.5 align-middle text-[10px] font-sans font-semibold uppercase tracking-[0.18em] text-accent-brand">ML</span>
          </span>
          <div className="flex-1" />
          <button type="button" className="hidden sm:flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer">
            <IcoPlus />Crear OVA
          </button>
          <div className="relative">
            <button type="button" onClick={() => setAvatarOpen(!avatarOpen)} className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 cursor-pointer" aria-label="Menú de usuario">
              JR
            </button>
            {avatarOpen && (
              <div className="absolute right-0 top-11 z-50 w-52 rounded-xl border border-border bg-card py-1 shadow-xl">
                <div className="border-b border-border px-4 py-2.5">
                  <p className="text-sm font-semibold">Jeffry Romero</p>
                  <p className="text-xs text-muted-foreground">jeffry@upao.edu.pe</p>
                </div>
                <button type="button" className="flex w-full items-center px-4 py-2 text-sm hover:bg-accent cursor-pointer">Mi Perfil</button>
                <button type="button" className="flex w-full items-center px-4 py-2 text-sm text-destructive hover:bg-accent cursor-pointer">Cerrar sesión</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
          <SidebarNav active={active} onClick={setActive} isAdmin={isAdmin} />
        </aside>

        {/* Mobile drawer */}
        {drawerOpen && (
          <>
            {/* biome-ignore lint/a11y: backdrop dismiss overlay; drawer has keyboard-accessible close button */}
            <div className="fixed inset-0 z-40 bg-foreground/30 md:hidden" onClick={() => setDrawerOpen(false)} />
            <aside className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-sidebar shadow-xl md:hidden">
              <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-4">
                <span className="font-display text-lg font-semibold">Gen<span className="text-primary">OVA</span></span>
                <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent cursor-pointer" aria-label="Cerrar menú"><IcoX /></button>
              </div>
              <SidebarNav active={active} onClick={(to) => { setActive(to); setDrawerOpen(false) }} isAdmin={isAdmin} />
            </aside>
          </>
        )}

        {/* Content area */}
        <main className="flex-1 overflow-auto p-6 lg:p-8">
          <div className="mx-auto max-w-4xl space-y-6">
            <div>
              <h1 className="font-display text-2xl font-semibold">{activeLabel}</h1>
              <p className="mt-1 text-sm text-muted-foreground">Contenido de ejemplo — wireframe de layout propuesto</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[['OVAs Creadas', 12], ['En progreso', 3], ['Exportadas', 9]].map(([label, val]) => (
                <div key={label} className="rounded-xl border border-border bg-card p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                  <p className="mt-1.5 text-3xl font-bold">{val}</p>
                </div>
              ))}
            </div>
            <div className="flex h-52 items-center justify-center rounded-xl border border-border bg-card">
              <p className="text-sm text-muted-foreground">Actividad reciente</p>
            </div>
            <div className="flex h-40 items-center justify-center rounded-xl border border-border bg-card">
              <p className="text-sm text-muted-foreground">Lista de OVAs</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
