import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Ico, WireframeBanner } from './WireframeUtils.jsx'

const LINKS = [
  { to: '/wireframe2', label: 'Dashboard', d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { to: '/wireframe3', label: 'Mis OVAs', d: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4' },
  { to: '/wireframe4', label: 'Crear OVA', d: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
  { to: '/papelera-wf', label: 'Papelera', d: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16', badge: 3 },
]
const ADMIN_LINKS = [
  { to: '/wireframe2', label: 'Roles', d: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z' },
  { to: '/wireframe2', label: 'Usuarios', d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
]

const IcoBars = () => <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
const IcoX = () => <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
const IcoPlus = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>

const lnk = (on) => `flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${on ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground/75 hover:bg-accent hover:text-foreground'}`

function NavItem({ item, active, onClick }) {
  const on = active === item.to
  return (
    <button type="button" onClick={() => onClick(item.to)} className={lnk(on)}>
      <Ico d={item.d} />
      <span className="flex-1 text-left">{item.label}</span>
      {item.badge && !on && <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-white">{item.badge}</span>}
    </button>
  )
}

function SidebarBody({ active, navigate, isAdmin }) {
  return (
    <>
      <nav className="flex-1 overflow-y-auto px-2 pb-3">
        <p className="px-2 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Principal</p>
        {LINKS.map((item) => <NavItem key={item.to + item.label} item={item} active={active} onClick={navigate} />)}
        {isAdmin && (
          <>
            <p className="px-2 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Administración</p>
            {ADMIN_LINKS.map((item) => <NavItem key={item.to + item.label} item={item} active={active} onClick={navigate} />)}
          </>
        )}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent transition-colors cursor-pointer">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">JR</div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-medium">Jeffry Romero</p>
              <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${isAdmin ? 'bg-primary/15 text-primary' : 'bg-accent-brand/15 text-accent-brand'}`}>
                {isAdmin ? 'Admin' : 'Estudiante'}
              </span>
            </div>
            <p className="truncate text-xs text-muted-foreground">jeffry@upao.edu.pe</p>
          </div>
        </div>
      </div>
    </>
  )
}

export function WireframeShell({ children, isAdmin = false, setIsAdmin }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const active = LINKS.find((l) => l.to === pathname)?.to ?? pathname

  const bannerExtra = setIsAdmin && (
    <button type="button" onClick={() => setIsAdmin(!isAdmin)} className="rounded border border-white/40 px-2 py-0.5 hover:bg-white/15 cursor-pointer">
      {isAdmin ? 'Admin ON' : 'Admin OFF'}
    </button>
  )

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <WireframeBanner extra={bannerExtra} />
      <header className="z-50 border-b border-border bg-card">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
          <button type="button" onClick={() => setDrawerOpen(true)} className="md:hidden -ml-1 rounded-lg p-2 text-muted-foreground hover:bg-accent cursor-pointer" aria-label="Menú"><IcoBars /></button>
          <button type="button" onClick={() => navigate('/wireframe2')} className="font-display text-xl font-semibold tracking-tight text-foreground">Gen<span className="text-primary">OVA</span><span className="ml-1.5 align-middle text-[10px] font-sans font-semibold uppercase tracking-[0.18em] text-accent-brand">ML</span></button>
          <div className="flex-1" />
          <button type="button" onClick={() => navigate('/wireframe4')} className="hidden sm:flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"><IcoPlus />Crear OVA</button>
          <div className="relative">
            <button type="button" onClick={() => setAvatarOpen(!avatarOpen)} className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 cursor-pointer" aria-label="Usuario">JR</button>
            {avatarOpen && (
              <div className="absolute right-0 top-11 z-50 w-52 rounded-xl border border-border bg-card py-1 shadow-xl">
                <div className="border-b border-border px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold">Jeffry Romero</p>
                    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${isAdmin ? 'bg-primary/15 text-primary' : 'bg-accent-brand/15 text-accent-brand'}`}>{isAdmin ? 'Admin' : 'Estudiante'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">jeffry@upao.edu.pe</p>
                </div>
                <button type="button" className="flex w-full items-center px-4 py-2 text-sm hover:bg-accent cursor-pointer">Mi Perfil</button>
                <button type="button" className="flex w-full items-center px-4 py-2 text-sm text-destructive hover:bg-accent cursor-pointer">Cerrar sesión</button>
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
          <SidebarBody active={active} navigate={navigate} isAdmin={isAdmin} />
        </aside>
        {drawerOpen && (
          <>
            {/* biome-ignore lint/a11y: backdrop dismiss */}
            <div className="fixed inset-0 z-40 bg-foreground/30 md:hidden" onClick={() => setDrawerOpen(false)} />
            <aside className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-sidebar shadow-xl md:hidden">
              <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-4">
                <span className="font-display text-lg font-semibold">Gen<span className="text-primary">OVA</span></span>
                <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent cursor-pointer" aria-label="Cerrar"><IcoX /></button>
              </div>
              <SidebarBody active={active} navigate={(to) => { navigate(to); setDrawerOpen(false) }} isAdmin={isAdmin} />
            </aside>
          </>
        )}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
