export function ModelPricingBadge({
  free,
  variable,
  pricing,
}: Readonly<{ free: boolean; variable: boolean; pricing?: string }>) {
  if (free) {
    return (
      <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-400">
        Gratis
      </span>
    );
  }
  if (variable) {
    return (
      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
        Variable
      </span>
    );
  }
  if (pricing) {
    return (
      <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
        {pricing.replace(" por 1M tokens", "")}
      </span>
    );
  }
  return null;
}
