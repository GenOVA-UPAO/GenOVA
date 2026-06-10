import { Link } from 'react-router'

export function NavbarBrand() {
  return (
    <Link to="/dashboard" className="text-lg font-semibold tracking-tight text-slate-900">
      GENOVA ML
    </Link>
  )
}
