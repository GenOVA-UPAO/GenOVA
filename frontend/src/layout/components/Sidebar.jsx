import { SidebarMenu } from './SidebarMenu.jsx'

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <SidebarMenu />
    </aside>
  )
}
