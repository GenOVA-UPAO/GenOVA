import { Link } from 'react-router'

export function NavbarBrand() {
  return (
    <Link
      to="/dashboard"
      className="font-display text-xl font-semibold tracking-tight text-foreground"
    >
      Gen<span className="text-primary">OVA</span>
      <span className="ml-1.5 align-middle text-[10px] font-sans font-semibold uppercase tracking-[0.18em] text-accent-brand">
        ML
      </span>
    </Link>
  )
}
