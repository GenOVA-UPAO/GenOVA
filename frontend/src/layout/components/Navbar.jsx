import { NavbarBrand } from './NavbarBrand.jsx'
import { NavbarMenuItems } from './NavbarMenuItems.jsx'

export function Navbar() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <NavbarBrand />
        <NavbarMenuItems />
      </div>
    </header>
  )
}
