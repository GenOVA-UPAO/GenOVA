import { Link } from "react-router";

export function NavbarBrand() {
  return (
    <Link
      to="/dashboard"
      aria-label="GenOVA"
      className="font-display text-lg font-semibold tracking-tight text-foreground"
    >
      Gen<span className="text-primary">OVA</span>
    </Link>
  );
}
