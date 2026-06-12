import { useEffect, useState } from 'react'
import { SidebarMenu } from './SidebarMenu.jsx'

export function Sidebar() {
  // Auto-collapse on smaller viewports and respond to live resizes / device rotation.
  const [isOpen, setIsOpen] = useState(() => window.innerWidth >= 1024)

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)')
    const onChange = (event) => setIsOpen(event.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return (
    <aside
      className={`hidden shrink-0 border-r border-sidebar-border bg-sidebar transition-all duration-300 md:block relative ${
        isOpen ? 'w-64 p-4' : 'w-12 p-2 flex flex-col items-center'
      }`}
    >
      <div className={`flex items-center mb-4 ${isOpen ? 'justify-between' : 'justify-center'}`}>
        {isOpen && (
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
            Navegación
          </p>
        )}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent transition-colors cursor-pointer"
          aria-label={isOpen ? 'Ocultar menú' : 'Mostrar menú'}
          title={isOpen ? 'Ocultar menú' : 'Mostrar menú'}
        >
          {isOpen ? (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </button>
      </div>

      <div
        className={`overflow-hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 hidden'
        }`}
      >
        <SidebarMenu />
      </div>
    </aside>
  )
}
