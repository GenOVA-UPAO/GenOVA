import type { ProviderCoverage as Coverage } from "./platform-key-meta";

const LABEL: Record<Coverage, string> = { texto: "Texto", imagen: "Imagen", video: "Video" };

/** Etiquetas de lo que se puede generar con la clave del proveedor. */
export function ProviderCoverage({ covers }: Readonly<{ covers: readonly Coverage[] }>) {
  if (covers.length === 0) return null;
  return (
    <span
      className="inline-flex flex-wrap gap-1"
      aria-label={`Sirve para: ${covers.map((c) => LABEL[c].toLowerCase()).join(", ")}`}
    >
      {covers.map((c) => (
        <span
          key={c}
          aria-hidden="true"
          className="rounded-full border border-border bg-muted/60 px-1.5 py-px text-[11px] leading-4 font-medium text-muted-foreground"
        >
          {LABEL[c]}
        </span>
      ))}
    </span>
  );
}
