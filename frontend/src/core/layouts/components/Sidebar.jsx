import { SidebarMenu } from '@/core/layouts/components/SidebarMenu.jsx'

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <SidebarMenu />
    </aside>
  )
}
