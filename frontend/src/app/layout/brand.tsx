import { Link } from "react-router";

export function NavbarBrand() {
  return (
    <Link
      to="/dashboard"
      aria-label="GenOVA"
      className="rounded-md font-display text-lg font-semibold tracking-tight text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      Gen<span className="text-primary">OVA</span>
    </Link>
  );
}
