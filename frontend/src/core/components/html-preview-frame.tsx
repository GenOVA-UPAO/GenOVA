import { useEffect, useRef, useState } from "react";

import { cn } from "@/core/lib/cn";

interface HtmlPreviewFrameProps {
  html?: string;
  /** Altura CSS del iframe; `null` para que la controle `className`. */
  height?: string | null;
  className?: string;
  title?: string;
}

/**
 * Previsualiza HTML generado en un iframe aislado (`sandbox="allow-scripts"`,
 * sin same-origin) a partir de un Blob URL que se revoca al cambiar o desmontar.
 */
export function HtmlPreviewFrame({
  html = "",
  height = "60vh",
  className = "block w-full border-0",
  title = "Vista previa del recurso",
}: Readonly<HtmlPreviewFrameProps>) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  // HTML ya pintado. Mientras no coincide, el iframe muestra un fondo pulsante:
  // un OVA pesa decenas de kB y el hueco en blanco parecía una versión vacía.
  const [loadedHtml, setLoadedHtml] = useState<string | null>(null);
  const loading = html !== "" && loadedHtml !== html;

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;
    if (html === "") {
      frame.src = "about:blank";
      return undefined;
    }
    // charset explícito: sin él los acentos del contenido salen corruptos.
    const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    frame.src = url;
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [html]);

  return (
    <iframe
      ref={frameRef}
      title={title}
      className={cn(className, loading && "animate-pulse bg-muted")}
      style={height === null ? undefined : { height }}
      sandbox="allow-scripts"
      aria-busy={loading || undefined}
      onLoad={(event) => {
        // El about:blank inicial también dispara load: solo cuenta el Blob.
        if (event.currentTarget.src.startsWith("blob:")) setLoadedHtml(html);
      }}
    />
  );
}
