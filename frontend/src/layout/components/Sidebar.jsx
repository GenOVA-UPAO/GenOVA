import { SidebarMenu } from './SidebarMenu.jsx'

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-4 md:block">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Navegación</p>
      <SidebarMenu />
    </aside>
  )
}
