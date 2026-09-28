import { ThemeMiniPreview } from "./theme-mini-preview";
import type { ThemeState } from "./theme-types";

interface ThemeModalPreviewProps {
  theme: ThemeState;
}

/** Vista previa aproximada del tema y la plantilla elegidos. */
export function ThemeModalPreview({ theme }: Readonly<ThemeModalPreviewProps>) {
  return (
    <figure className="space-y-2">
      <ThemeMiniPreview
        colorMode={theme.colorMode}
        designMode={theme.designMode}
        palette={theme.palette}
      />
      <figcaption className="text-xs text-muted-foreground">
        Vista previa aproximada de la estructura y los colores.
      </figcaption>
    </figure>
  );
}
