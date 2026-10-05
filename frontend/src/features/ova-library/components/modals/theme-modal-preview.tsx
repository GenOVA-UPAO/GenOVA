import i18n from "i18next";
import { useTranslation } from "react-i18next";

import { ThemeMiniPreview } from "./theme-mini-preview";
import type { ThemeState } from "./theme-types";

interface ThemeModalPreviewProps {
  theme: ThemeState;
}

/** Vista previa aproximada del tema y la plantilla elegidos. */
export function ThemeModalPreview({ theme }: Readonly<ThemeModalPreviewProps>) {
  useTranslation();
  return (
    <figure className="space-y-2">
      <ThemeMiniPreview
        colorMode={theme.colorMode}
        designMode={theme.designMode}
        palette={theme.palette}
      />
      <figcaption className="text-xs text-muted-foreground">
        {i18n.t("ova-library:vista_previa_aproximada_de_la_estructura_y_los_colores")}{" "}
      </figcaption>
    </figure>
  );
}
