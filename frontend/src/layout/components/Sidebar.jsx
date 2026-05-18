import { useState, useEffect } from 'react'
import { SidebarMenu } from './SidebarMenu.jsx'

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(true)

  // Auto-collapse on smaller screens on mount
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsOpen(false)
    }
  }, [])

  return (
    <aside 
      className={`hidden shrink-0 border-r border-slate-200 bg-white transition-all duration-300 md:block relative ${isOpen ? 'w-64 p-4' : 'w-12 p-2 flex flex-col items-center'}`}
    >
      <div className={`flex items-center mb-4 ${isOpen ? 'justify-between' : 'justify-center'}`}>
        {isOpen && (
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">Navegación</p>
        )}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
          title={isOpen ? "Ocultar menú" : "Mostrar menú"}
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

      <div className={`overflow-hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
        <SidebarMenu />
      </div>
    </aside>
  )
}
