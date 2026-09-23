export function ModelPricingBadge({
  free,
  variable,
  pricing,
}: Readonly<{ free: boolean; variable: boolean; pricing?: string }>) {
  if (free) {
    return (
      <span className="shrink-0 rounded-full bg-success/12 px-2 py-0.5 text-xs font-medium text-success-strong">
        Gratis
      </span>
    );
  }
  if (variable) {
    return (
      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        Variable
      </span>
    );
  }
  if (pricing) {
    return (
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums" title="Precio por millón de tokens (entrada / salida)">
        {pricing.replace(" por 1M tokens", "")}
      </span>
    );
  }
  return null;
}
