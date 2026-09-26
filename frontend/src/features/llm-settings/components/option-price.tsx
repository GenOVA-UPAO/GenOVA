/** Precio de una opción: «Gratis» destacado o el par entrada / salida. */
export function OptionPrice({ price, free }: Readonly<{ price: string | null; free: boolean }>) {
  if (!price) return null;
  if (free) {
    return (
      <span className="shrink-0 rounded-full bg-success/12 px-2 py-0.5 text-xs font-medium text-success-strong">
        {price}
      </span>
    );
  }
  return <span className="shrink-0 text-xs text-foreground/80 tabular-nums">{price}</span>;
}
